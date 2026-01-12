import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { TeamsService } from '@/app/lib/services/IntegrationService';

// POST /api/integrations/oauth/teams - Handle Microsoft Teams OAuth callback
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
            platform: 'teams',
            accessToken,
            refreshToken,
            tokenExpiresAt: expiresAt ? new Date(expiresAt) : null,
            scope,
            platformUserId: userInfo?.id,
            platformEmail: userInfo?.email,
            platformName: userInfo?.name,
            settings: {
                timeZone: userInfo?.timeZone || 'UTC',
                allowNewTimeProposals: true,
                isOnlineMeeting: true
            }
        };

        const integration = await integrationRepo.upsertCoachIntegration(integrationData);

        return NextResponse.json({
            message: 'Microsoft Teams connected successfully',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive
            }
        });
    } catch (error) {
        console.error('Teams OAuth error:', error);
        return NextResponse.json(
            { error: 'Failed to connect Microsoft Teams' },
            { status: 500 }
        );
    }
}

// GET /api/integrations/oauth/teams - Test Microsoft Teams connection
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;
        const integration = await integrationRepo.getCoachIntegration(coachId, 'teams');

        if (!integration) {
            return NextResponse.json(
                { error: 'Microsoft Teams not connected' },
                { status: 404 }
            );
        }

        // Test the connection by fetching events
        const teamsService = new TeamsService(integration.accessToken);
        const events = await teamsService.getEvents();

        return NextResponse.json({
            message: 'Microsoft Teams connection is active',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive
            },
            recentEvents: events.slice(0, 5) // Return first 5 events
        });
    } catch (error) {
        console.error('Teams test error:', error);
        return NextResponse.json(
            { error: 'Microsoft Teams connection failed' },
            { status: 500 }
        );
    }
}
