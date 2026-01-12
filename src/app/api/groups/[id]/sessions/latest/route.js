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

        const { id: groupId } = await params;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Verify user has access to this group
        let hasAccess = false;

        if (session.user.role === 'coach') {
            // Check if coach manages this group
            const coachGroup = await sql`
        SELECT id FROM "Group" 
        WHERE id = ${groupId} AND "coachId" = ${session.user.id}
      `;
            hasAccess = coachGroup.length > 0;
        } else if (session.user.role === 'client') {
            // Check if client is a member of this group
            const clientRecord = await sql`
        SELECT c.id FROM "Client" c WHERE c."userId" = ${session.user.id}
      `;

            if (clientRecord.length > 0) {
                const clientId = clientRecord[0].id;
                const clientGroup = await sql`
          SELECT id FROM "Group" 
          WHERE id = ${groupId} AND ${clientId} = ANY("selectedMembers")
        `;
                hasAccess = clientGroup.length > 0;
            }
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get the latest session for this group
        const latestSession = await sql`
      SELECT 
        s.id,
        s.title,
        s.description,
        s."sessionDate",
        s."sessionTime",
        s.duration,
        s.location,
        s."meetingLink",
        s.status,
        s."createdAt"
      FROM "Session" s
      WHERE s."groupId" = ${groupId}
      AND s.status IN ('scheduled', 'in_progress')
      ORDER BY s."sessionDate" DESC, s."sessionTime" DESC
      LIMIT 1
    `;

        if (latestSession.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No active session found for this group'
            });
        }

        const sessionData = latestSession[0];

        return NextResponse.json({
            success: true,
            session: {
                id: sessionData.id,
                title: sessionData.title,
                description: sessionData.description,
                sessionDate: sessionData.sessionDate,
                sessionTime: sessionData.sessionTime,
                duration: sessionData.duration,
                location: sessionData.location,
                meetingUrl: sessionData.meetingLink,
                status: sessionData.status,
                createdAt: sessionData.createdAt
            }
        });

    } catch (error) {
        console.error('Error getting latest group session:', error);
        return NextResponse.json(
            { error: 'Failed to get latest session' },
            { status: 500 }
        );
    }
}
