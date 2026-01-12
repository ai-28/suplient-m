import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { GoogleCalendarService, ZoomService, TeamsService } from '@/app/lib/services/IntegrationService';

// POST /api/integrations/oauth/google - Handle Google OAuth callback
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { accessToken, refreshToken, expiresAt, scope, userInfo } = body;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Access token is required' },
                { status: 400 }
            );
        }

        const coachId = session.user.id;
        const integrationData = {
            coachId,
            platform: 'google_calendar',
            accessToken,
            refreshToken,
            tokenExpiresAt: expiresAt ? new Date(expiresAt) : null,
            scope,
            platformUserId: userInfo?.id,
            platformEmail: userInfo?.email,
            platformName: userInfo?.name,
            settings: {
                calendarId: 'primary',
                timeZone: userInfo?.timeZone || 'UTC'
            }
        };

        const integration = await integrationRepo.upsertCoachIntegration(integrationData);

        return NextResponse.json({
            message: 'Google Calendar connected successfully',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive
            }
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        return NextResponse.json(
            { error: 'Failed to connect Google Calendar' },
            { status: 500 }
        );
    }
}

// GET /api/integrations/oauth/google - Test Google Calendar connection
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;
        const integration = await integrationRepo.getCoachIntegration(coachId, 'google_calendar');

        if (!integration) {
            return NextResponse.json(
                { error: 'Google Calendar not connected' },
                { status: 404 }
            );
        }

        // Test the connection by fetching calendars
        const googleService = new GoogleCalendarService(integration.accessToken);
        const calendars = await googleService.getCalendars();

        return NextResponse.json({
            message: 'Google Calendar connection is active',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive
            },
            calendars: calendars.slice(0, 5) // Return first 5 calendars
        });
    } catch (error) {
        console.error('Google Calendar test error:', error);
        return NextResponse.json(
            { error: 'Google Calendar connection failed' },
            { status: 500 }
        );
    }
}
