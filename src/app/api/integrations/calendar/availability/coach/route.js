import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { GoogleCalendarService } from '@/app/lib/services/IntegrationService';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Only clients can access this
        if (session.user.role !== 'client') {
            return NextResponse.json({ error: 'Only clients can access this' }, { status: 403 });
        }
        
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date'); // YYYY-MM-DD format
        const coachId = searchParams.get('coachId');
        
        if (!date) {
            return NextResponse.json(
                { error: 'Date parameter is required' },
                { status: 400 }
            );
        }
        
        // Get client's coach
        let actualCoachId = coachId;
        if (!actualCoachId) {
            const clientResult = await sql`
                SELECT "coachId" FROM "User"
                WHERE id = ${session.user.id} AND role = 'client'
                LIMIT 1
            `;
            
            if (clientResult.length === 0 || !clientResult[0].coachId) {
                return NextResponse.json(
                    { error: 'No coach assigned' },
                    { status: 404 }
                );
            }
            actualCoachId = clientResult[0].coachId;
        }
        
        // Verify client belongs to this coach
        const verifyResult = await sql`
            SELECT id FROM "User"
            WHERE id = ${session.user.id} AND "coachId" = ${actualCoachId} AND role = 'client'
            LIMIT 1
        `;
        
        if (verifyResult.length === 0) {
            return NextResponse.json(
                { error: 'Unauthorized to access this coach' },
                { status: 403 }
            );
        }
        
        // Get coach's sessions from database
        const coachSessions = await sql`
            SELECT "sessionDate", "sessionTime", duration
            FROM "Session"
            WHERE "coachId" = ${actualCoachId}
            AND "sessionDate" = ${date}::date
            AND status = 'scheduled'
        `;
        
        // Get Google Calendar integration
        const integration = await integrationRepo.getCoachIntegration(
            actualCoachId, 
            'google_calendar'
        );
        
        let googleCalendarEvents = [];
        let calendarConnected = false;
        
        if (integration && integration.isActive) {
            try {
                const googleService = new GoogleCalendarService(integration);
                const result = await googleService.getEventsForDate(date);
                if (result.success) {
                    googleCalendarEvents = result.events;
                    calendarConnected = true;
                }
            } catch (error) {
                console.error('Error fetching Google Calendar events:', error);
            }
        }
        
        return NextResponse.json({
            success: true,
            coachSessions: coachSessions,
            googleCalendarEvents: googleCalendarEvents,
            calendarConnected: calendarConnected
        });
    } catch (error) {
        console.error('Error fetching coach availability:', error);
        return NextResponse.json(
            { error: 'Failed to fetch coach availability' },
            { status: 500 }
        );
    }
}

