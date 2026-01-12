import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { resourceId, clientId } = body;

        if (!resourceId || !clientId) {
            return NextResponse.json(
                { error: 'Resource ID and Client ID are required' },
                { status: 400 }
            );
        }

        // First, get the current resource to verify ownership and get current clientIds
        const resource = await sql`
            SELECT "clientIds", "coachId" 
            FROM "Resource" 
            WHERE id = ${resourceId}
        `;

        if (resource.length === 0) {
            return NextResponse.json(
                { error: 'Resource not found' },
                { status: 404 }
            );
        }

        // Verify the coach owns this resource
        if (resource[0].coachId !== session.user.id) {
            return NextResponse.json(
                { error: 'Unauthorized to modify this resource' },
                { status: 403 }
            );
        }

        const currentClientIds = resource[0].clientIds || [];

        // Remove the clientId from the array
        const updatedClientIds = currentClientIds.filter(id => id !== clientId);

        // Update the resource with the new clientIds array
        const updatedResource = await sql`
            UPDATE "Resource"
            SET 
                "clientIds" = ${updatedClientIds},
                "updatedAt" = NOW()
            WHERE id = ${resourceId}
            RETURNING *
        `;

        console.log('✅ Client removed from resource:', {
            resourceId,
            clientId,
            previousClientIds: currentClientIds,
            newClientIds: updatedClientIds
        });

        return NextResponse.json({
            message: 'Client removed from resource successfully',
            resource: updatedResource[0],
            removedClientId: clientId,
            updatedClientIds: updatedClientIds
        });

    } catch (error) {
        console.error('Remove client from resource error:', error);
        return NextResponse.json(
            { error: 'Failed to remove client from resource' },
            { status: 500 }
        );
    }
}
