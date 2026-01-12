import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { GoogleCalendarService } from '@/app/lib/services/IntegrationService';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date'); // YYYY-MM-DD format
        
        if (!date) {
            return NextResponse.json(
                { error: 'Date parameter is required' },
                { status: 400 }
            );
        }
        
        const coachId = session.user.id;
        
        // Get Google Calendar integration
        const integration = await integrationRepo.getCoachIntegration(
            coachId, 
            'google_calendar'
        );
        
        if (!integration || !integration.isActive) {
            // No Google Calendar connected - return empty events
            return NextResponse.json({
                success: true,
                events: [],
                connected: false
            });
        }
        
        // Fetch events from Google Calendar
        const googleService = new GoogleCalendarService(integration);
        const result = await googleService.getEventsForDate(date);
        
        if (result.success) {
            return NextResponse.json({
                success: true,
                events: result.events,
                connected: true
            });
        } else {
            // If fetch fails, return empty but indicate connection exists
            return NextResponse.json({
                success: false,
                events: [],
                connected: true,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error fetching calendar availability:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar availability' },
            { status: 500 }
        );
    }
}

