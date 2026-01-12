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
        const { resourceId, clientIds, groupIds, message } = body;

        if (!resourceId) {
            return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
        }

        if ((!clientIds || clientIds.length === 0) && (!groupIds || groupIds.length === 0)) {
            return NextResponse.json({ error: 'At least one client or group must be selected' }, { status: 400 });
        }

        // Verify the resource exists and belongs to the current coach
        const resourceCheck = await sql`
            SELECT r.id, r.title, r."coachId"
            FROM "Resource" r
            WHERE r.id = ${resourceId} AND r."coachId" = ${session.user.id}
        `;

        if (resourceCheck.length === 0) {
            return NextResponse.json({ error: 'Resource not found or access denied' }, { status: 404 });
        }

        const resource = resourceCheck[0];

        // Update the resource with client and group assignments as arrays
        const updatedResource = await sql`
            UPDATE "Resource"
            SET 
                "clientIds" = ${clientIds || []},
                "groupIds" = ${groupIds || []},
                "updatedAt" = NOW()
            WHERE id = ${resourceId}
            RETURNING *
        `;

        // Create notifications for clients when resource is shared
        try {
            const { NotificationService } = require('@/app/lib/services/NotificationService');

            // Get client details for notifications
            if (clientIds && clientIds.length > 0) {
                const clientDetails = await sql`
                    SELECT c.id, c.name, c."userId"
                    FROM "Client" c
                    WHERE c.id = ANY(${clientIds})
                `;

                for (const client of clientDetails) {
                    await NotificationService.notifyResourceShared(
                        client.userId,  // Use userId instead of client.id
                        session.user.id,
                        session.user.name,
                        resource.title
                    );
                }
                console.log('✅ Resource sharing notifications created for', clientDetails.length, 'clients');
            }
        } catch (notificationError) {
            console.error('❌ Error creating resource sharing notifications:', notificationError);
            // Don't fail resource sharing if notification creation fails
        }

        return NextResponse.json({
            message: 'Resource shared successfully',
            resource: updatedResource[0],
            sharedWith: {
                clients: clientIds || [],
                groups: groupIds || []
            }
        });

    } catch (error) {
        console.error('Share resource error:', error);
        return NextResponse.json(
            { error: 'Failed to share resource' },
            { status: 500 }
        );
    }
}
