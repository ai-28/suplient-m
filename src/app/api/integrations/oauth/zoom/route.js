import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { ZoomService } from '@/app/lib/services/IntegrationService';

// POST /api/integrations/oauth/zoom - Handle Zoom OAuth callback
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
            platform: 'zoom',
            accessToken,
            refreshToken,
            tokenExpiresAt: expiresAt ? new Date(expiresAt) : null,
            scope,
            platformUserId: userInfo?.id,
            platformEmail: userInfo?.email,
            platformName: userInfo?.name,
            settings: {
                defaultPassword: true,
                waitingRoom: true,
                joinBeforeHost: false,
                muteUponEntry: true,
                autoRecording: 'none'
            }
        };

        const integration = await integrationRepo.upsertCoachIntegration(integrationData);

        return NextResponse.json({
            message: 'Zoom connected successfully',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive
            }
        });
    } catch (error) {
        console.error('Zoom OAuth error:', error);
        return NextResponse.json(
            { error: 'Failed to connect Zoom' },
            { status: 500 }
        );
    }
}

// GET /api/integrations/oauth/zoom - Test Zoom connection
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;
        const integration = await integrationRepo.getCoachIntegration(coachId, 'zoom');

        if (!integration) {
            return NextResponse.json(
                { error: 'Zoom not connected' },
                { status: 404 }
            );
        }

        // Test the connection by fetching user info
        const zoomService = new ZoomService(integration.accessToken);
        const meetings = await zoomService.getMeetings();

        return NextResponse.json({
            message: 'Zoom connection is active',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive
            },
            recentMeetings: meetings.slice(0, 5) // Return first 5 meetings
        });
    } catch (error) {
        console.error('Zoom test error:', error);
        return NextResponse.json(
            { error: 'Zoom connection failed' },
            { status: 500 }
        );
    }
}
