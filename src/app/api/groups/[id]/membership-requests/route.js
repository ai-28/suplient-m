import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// POST /api/groups/[id]/membership-requests - Send group join request notification
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;
        const { message } = await request.json();

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Verify user is a client
        if (session.user.role !== 'client') {
            return NextResponse.json({ error: 'Only clients can request to join groups' }, { status: 403 });
        }

        // Get client record
        const clientRecord = await sql`
      SELECT c.id, c.name, c."userId"
      FROM "Client" c
      WHERE c."userId" = ${session.user.id}
    `;

        if (clientRecord.length === 0) {
            return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
        }

        const client = clientRecord[0];

        // Get group details and coach info
        const groupDetails = await sql`
      SELECT 
        g.id,
        g.name,
        g.description,
        g."coachId",
        u.name as "coachName",
        u.email as "coachEmail"
      FROM "Group" g
      JOIN "User" u ON g."coachId" = u.id
      WHERE g.id = ${groupId}
    `;

        if (groupDetails.length === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const group = groupDetails[0];

        // Check if client is already a member
        const isAlreadyMember = await sql`
      SELECT id FROM "Group" 
      WHERE id = ${groupId} AND ${client.id} = ANY("selectedMembers")
    `;

        if (isAlreadyMember.length > 0) {
            return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 });
        }

        // Send real-time notification to coach
        try {
            const { NotificationService } = require('@/app/lib/services/NotificationService');

            await NotificationService.notifyGroupJoinRequest(
                group.coachId,
                group.id,
                group.name,
                client.id,
                client.name,
                session.user.email,
                message
            );

            console.log('✅ Group join request notification sent to coach:', group.coachName);
        } catch (notificationError) {
            console.error('❌ Error creating group join request notification:', notificationError);
            return NextResponse.json(
                { error: 'Failed to send notification to coach' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Join request sent to coach successfully'
        });

    } catch (error) {
        console.error('Error sending group join request:', error);
        return NextResponse.json(
            { error: 'Failed to send join request' },
            { status: 500 }
        );
    }
}

