import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { clientId } = await params;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        // Verify the client belongs to the current coach
        const clientCheck = await sql`
            SELECT c.id, c.name, c."coachId"
            FROM "Client" c
            WHERE c.id = ${clientId} AND c."coachId" = ${session.user.id}
        `;

        if (clientCheck.length === 0) {
            return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
        }

        // Fetch resources shared with this client
        const resources = await sql`
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
                r."coachId",
                r."clientIds",
                r."groupIds",
                r."createdAt",
                r."updatedAt",
                u.name as "coachName"
            FROM "Resource" r
            LEFT JOIN "User" u ON r."coachId" = u.id
            WHERE ${clientId} = ANY(r."clientIds")
            ORDER BY r."updatedAt" DESC
        `;

        // Format the resources for display
        const formattedResources = resources.map(resource => ({
            id: resource.id,
            name: resource.title,
            type: resource.resourceType?.toUpperCase() || 'FILE',
            size: resource.fileSize ? formatFileSize(resource.fileSize) : 'Unknown',
            sharedDate: formatDate(resource.updatedAt),
            sharedBy: resource.coachName || 'Unknown',
            url: resource.url,
            fileName: resource.fileName,
            description: resource.description,
            author: resource.author,
            resourceType: resource.resourceType,
            clientIds: resource.clientIds || [],
            groupIds: resource.groupIds || []
        }));

        return NextResponse.json({
            message: 'Resources fetched successfully',
            resources: formattedResources,
            count: formattedResources.length
        });

    } catch (error) {
        console.error('Get client resources error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch client resources' },
            { status: 500 }
        );
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    if (i === 0) return `${bytes} ${sizes[i]}`;
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
}
