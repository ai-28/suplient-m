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
        const { resourceId, groupId } = body;

        if (!resourceId || !groupId) {
            return NextResponse.json(
                { error: 'Resource ID and Group ID are required' },
                { status: 400 }
            );
        }

        // First, get the current resource to verify ownership and get current groupIds
        const resource = await sql`
            SELECT "groupIds", "coachId" 
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

        const currentGroupIds = resource[0].groupIds || [];

        // Remove the groupId from the array
        const updatedGroupIds = currentGroupIds.filter(id => id !== groupId);

        // Update the resource with the new groupIds array
        const updatedResource = await sql`
            UPDATE "Resource"
            SET 
                "groupIds" = ${updatedGroupIds},
                "updatedAt" = NOW()
            WHERE id = ${resourceId}
            RETURNING *
        `;

        return NextResponse.json({
            message: 'Group removed from resource successfully',
            resource: updatedResource[0],
            removedGroupId: groupId,
            updatedGroupIds: updatedGroupIds
        });

    } catch (error) {
        console.error('Remove group from resource error:', error);
        return NextResponse.json(
            { error: 'Failed to remove group from resource' },
            { status: 500 }
        );
    }
}
