import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';

// GET /api/sessions/upcoming - Get upcoming sessions for a client
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the client ID
        const clientResult = await sql`
            SELECT id FROM "Client" 
            WHERE "userId" = ${session.user.id}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client record not found' },
                { status: 404 }
            );
        }

        const clientId = clientResult[0].id;

        // Get upcoming sessions for the client (both individual and group sessions)
        const sessionsResult = await sql`
            SELECT 
                s.id,
                s.title,
                s.description,
                s."sessionDate",
                s."sessionTime",
                s.duration,
                s."sessionType",
                s.location,
                s."meetingLink",
                s.status,
                s."coachId",
                s."groupId",
                u.name as "coachName",
                u.email as "coachEmail",
                u.avatar as "coachAvatar",
                g.name as "groupName"
            FROM "Session" s
            LEFT JOIN "User" u ON s."coachId" = u.id
            LEFT JOIN "Group" g ON s."groupId" = g.id
            WHERE (
                s."clientId" = ${clientId}
                OR (
                    s."groupId" IS NOT NULL 
                    AND s."groupId" IN (
                        SELECT "groupId" FROM "Client" WHERE id = ${clientId}
                    )
                )
            )
            AND s.status IN ('scheduled', 'in_progress')
            AND s."sessionDate" >= CURRENT_DATE
            ORDER BY s."sessionDate" ASC, s."sessionTime" ASC
            LIMIT 5
        `;

        // Transform the data to match the expected format
        const upcomingSessions = sessionsResult.map(session => {
            const sessionDate = new Date(session.sessionDate);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

            // Calculate relative date
            let relativeDate;
            if (sessionDay.getTime() === today.getTime()) {
                relativeDate = "Today";
            } else if (sessionDay.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
                relativeDate = "Tomorrow";
            } else {
                relativeDate = sessionDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
            }

            // Format time
            const time = new Date(`2000-01-01T${session.sessionTime}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            return {
                id: session.id,
                therapist: session.sessionType === 'group'
                    ? session.groupName || 'Group Session'
                    : session.coachName || 'Coach',
                therapistAvatar: session.sessionType === 'group' ? null : (session.coachAvatar || null),
                date: relativeDate,
                time: time,
                type: session.sessionType === 'group' ? 'Group' : 'Individual',
                title: session.title,
                description: session.description,
                location: session.location,
                meetingLink: session.meetingLink,
                duration: session.duration
            };
        });

        return NextResponse.json({ upcomingSessions });

    } catch (error) {
        console.error('Error retrieving upcoming sessions:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
