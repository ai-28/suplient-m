import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { GoogleCalendarService, ZoomService, TeamsService } from '@/app/lib/services/IntegrationService';

// POST /api/integrations/refresh-token - Refresh integration tokens
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { platform } = body;

        if (!platform) {
            return NextResponse.json(
                { error: 'Platform is required' },
                { status: 400 }
            );
        }

        const coachId = session.user.id;

        // Get the integration
        const integration = await integrationRepo.getCoachIntegration(coachId, platform);

        if (!integration) {
            return NextResponse.json(
                { error: `No ${platform} integration found` },
                { status: 404 }
            );
        }

        if (!integration.refreshToken) {
            return NextResponse.json(
                { error: 'No refresh token available. Please reconnect the integration.' },
                { status: 400 }
            );
        }

        let refreshedTokenData;
        let service;

        // Refresh token based on platform
        switch (platform) {
            case 'google_calendar':
                service = new GoogleCalendarService(integration);
                refreshedTokenData = await service.refreshAccessToken();
                break;

            case 'zoom':
                service = new ZoomService(integration);
                refreshedTokenData = await service.refreshAccessToken();
                break;

            case 'teams':
                service = new TeamsService(integration);
                refreshedTokenData = await service.refreshAccessToken();
                break;

            default:
                return NextResponse.json(
                    { error: `Unsupported platform: ${platform}` },
                    { status: 400 }
                );
        }

        if (!refreshedTokenData?.accessToken) {
            return NextResponse.json(
                { error: 'Failed to refresh token' },
                { status: 500 }
            );
        }

        // Update the database with the new token
        await integrationRepo.updateIntegrationToken(
            integration.id,
            refreshedTokenData.accessToken,
            refreshedTokenData.expiresAt
        );

        // Update refresh token if provided (Teams sometimes provides new refresh token)
        if (refreshedTokenData.refreshToken) {
            await integrationRepo.updateIntegrationRefreshToken(
                integration.id,
                refreshedTokenData.refreshToken
            );
        }

        return NextResponse.json({
            message: `${platform} token refreshed successfully`,
            platform,
            expiresAt: refreshedTokenData.expiresAt
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return NextResponse.json(
            { error: `Failed to refresh token: ${error.message}` },
            { status: 500 }
        );
    }
}
