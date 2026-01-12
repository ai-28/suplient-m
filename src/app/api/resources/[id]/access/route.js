import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { userStatsRepo } from '@/app/lib/db/userStatsRepo';

// GET /api/resources/[id]/access - Get resource access URL or download
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resourceId = await params.id;
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'access'; // 'access' or 'download'

        if (!resourceId) {
            return NextResponse.json(
                { error: 'Resource ID is required' },
                { status: 400 }
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

        // Get the resource and verify access
        const resourceResult = await sql`
            SELECT 
                r.id,
                r.title,
                r.description,
                r."resourceType",
                r.url,
                r."fileName",
                r."fileSize",
                r."fileType",
                r.author
            FROM "Resource" r
            WHERE r.id = ${resourceId}
            AND (
                ${clientId} = ANY(r."clientIds")
                OR EXISTS (
                    SELECT 1 FROM "Group" g 
                    WHERE g.id = ANY(r."groupIds") 
                    AND ${clientId} = ANY(g."selectedMembers")
                )
            )
            LIMIT 1
        `;

        if (resourceResult.length === 0) {
            return NextResponse.json(
                { error: 'Resource not found or access denied' },
                { status: 404 }
            );
        }

        const resource = resourceResult[0];

        // Handle different resource types
        const response = {
            resource: {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                resourceType: resource.resourceType,
                url: resource.url,
                fileName: resource.fileName,
                fileSize: resource.fileSize,
                fileType: resource.fileType,
                author: resource.author
            }
        };

        // For download action, provide download information
        if (action === 'download') {
            response.downloadUrl = resource.url;
            response.fileName = resource.fileName;
            response.fileSize = resource.fileSize;
            response.fileType = resource.fileType;
        }

        // For access action, provide viewing information
        if (action === 'access') {
            response.accessUrl = resource.url;
            response.canEmbed = canEmbedResource(resource.resourceType);

            // Only track resource completion for clients (not coaches)
            // Check if the current user is a client by verifying they have a client record
            const isClient = clientResult.length > 0;

            if (isClient) {
                try {
                    await sql`
                        INSERT INTO "ResourceCompletion" ("resourceId", "clientId", "completedAt")
                        VALUES (${resourceId}, ${clientId}, NOW())
                        ON CONFLICT ("resourceId", "clientId") 
                        DO UPDATE SET "completedAt" = NOW()
                    `;

                    // Award points for resource viewing (only for clients)
                    const today = new Date().toISOString().split('T')[0];
                    await userStatsRepo.addEngagementActivity(session.user.id, 'resource', 1, today);
                } catch (engagementError) {
                    console.error('Error recording resource completion:', engagementError);
                    // Don't fail the resource access if tracking fails
                }
            }
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('Get resource access error:', error);

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

// Helper function to determine if resource can be embedded
function canEmbedResource(resourceType) {
    const embeddableTypes = ['video', 'image', 'article'];
    return embeddableTypes.includes(resourceType);
}
