import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'client') {
            return NextResponse.json({ error: 'Only clients can access this endpoint' }, { status: 403 });
        }

        // Get the client's coach information
        const result = await sql`
            SELECT 
                u.id as "clientUserId",
                u."coachId",
                u_coach.id as "coachUserId",
                u_coach.name as "coachName",
                u_coach.email as "coachEmail",
                u_coach.phone as "coachPhone",
                u_coach.avatar as "coachAvatar"
            FROM "User" u
            JOIN "User" u_coach ON u."coachId" = u_coach.id
            WHERE u.id = ${session.user.id}
            AND u.role = 'client'
            LIMIT 1
        `;
        
        // Get coach's timezone from Google Calendar integration if available
        let coachTimezone = 'UTC';
        if (result.length > 0) {
            try {
                const { integrationRepo } = await import('@/app/lib/db/integrationSchema');
                const googleIntegration = await integrationRepo.getCoachIntegration(result[0].coachUserId, 'google_calendar');
                if (googleIntegration?.settings?.timeZone) {
                    coachTimezone = googleIntegration.settings.timeZone;
                } else {
                    // Fallback to browser timezone detection (we'll use UTC as default)
                    coachTimezone = 'UTC';
                }
            } catch (error) {
                console.warn('Failed to get coach timezone from integration:', error);
            }
        }

        if (result.length === 0) {

            // Check if client exists but has no coach
            const clientCheck = await sql`
                SELECT id, "coachId", name, email, role
                FROM "User" 
                WHERE id = ${session.user.id}
                AND role = 'client'
            `;


            if (clientCheck.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Client not found'
                }, { status: 404 });
            } else if (!clientCheck[0].coachId) {
                return NextResponse.json({
                    success: false,
                    error: 'No coach assigned to this client'
                }, { status: 404 });
            } else {
                return NextResponse.json({
                    success: false,
                    error: 'Coach not found in database'
                }, { status: 404 });
            }
        }

        const clientCoachData = result[0];

        const coach = {
            id: clientCoachData.coachUserId,
            name: clientCoachData.coachName,
            email: clientCoachData.coachEmail,
            phone: clientCoachData.coachPhone,
            avatar: clientCoachData.coachAvatar,
            timezone: coachTimezone
        };

        return NextResponse.json({
            success: true,
            coach: coach
        });

    } catch (error) {
        console.error('❌ Error in client coach API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch coach information',
                details: error.message
            },
            { status: 500 }
        );
    }
}