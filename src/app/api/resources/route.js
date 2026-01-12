import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/resources - Get resources for a client
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if database connection is available
        if (!process.env.POSTGRES_URL) {
            console.error('POSTGRES_URL environment variable is not set');
            return NextResponse.json(
                { error: 'Database configuration error. Please check environment variables.' },
                { status: 500 }
            );
        }

        // Get the client ID from session
        const clientResult = await sql`
            SELECT c.id
            FROM "Client" c
            WHERE c."userId" = ${session.user.id}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            );
        }

        const clientId = clientResult[0].id;

        // Get resources assigned to this client or their groups
        const resourcesResult = await sql`
            SELECT 
                r.id,
                r.title,
                r.description,
                r."resourceType",
                r.url,
                r."fileName",
                r."fileSize",
                r."fileType",
                r.author,
                r."createdAt",
                r."updatedAt"
            FROM "Resource" r
            WHERE (
                ${clientId} = ANY(r."clientIds")
                OR EXISTS (
                    SELECT 1 FROM "Group" g 
                    WHERE g.id = ANY(r."groupIds") 
                    AND ${clientId} = ANY(g."selectedMembers")
                )
            )
            ORDER BY r."createdAt" DESC
        `;

        // Transform the data to match the expected frontend format
        const resources = resourcesResult.map(resource => ({
            id: resource.id,
            title: resource.title,
            description: resource.description,
            type: getResourceTypeDisplay(resource.resourceType),
            category: getResourceCategory(resource.resourceType),
            duration: getResourceDuration(resource.resourceType, resource.fileSize),
            rating: getResourceRating(resource.resourceType), // Mock rating for now
            url: resource.url,
            fileName: resource.fileName,
            fileSize: resource.fileSize,
            fileType: resource.fileType,
            author: resource.author,
            createdAt: resource.createdAt,
            updatedAt: resource.updatedAt
        }));

        return NextResponse.json({ resources });

    } catch (error) {
        console.error('Get resources error:', error);

        // Handle specific database connection errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { error: 'Database connection failed. Please check your database configuration.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// Helper functions to transform resource data
function getResourceTypeDisplay(resourceType) {
    const typeMap = {
        'video': 'Video',
        'image': 'Image',
        'article': 'Article',
        'sound': 'Audio'
    };
    return typeMap[resourceType] || 'Resource';
}

function getResourceCategory(resourceType) {
    const categoryMap = {
        'video': 'Videos',
        'image': 'Images',
        'article': 'Articles',
        'sound': 'Audio'
    };
    return categoryMap[resourceType] || 'Resources';
}

function getResourceDuration(resourceType, fileSize) {
    // Mock duration based on resource type
    const durationMap = {
        'video': '15 min',
        'image': '2 min view',
        'article': '5 min read',
        'sound': '20 min'
    };
    return durationMap[resourceType] || 'N/A';
}

function getResourceRating(resourceType) {
    // Mock rating - in real implementation, this could be calculated from user ratings
    const ratingMap = {
        'video': 4.7,
        'image': 4.5,
        'article': 4.8,
        'sound': 4.6
    };
    return ratingMap[resourceType] || 4.5;
}
