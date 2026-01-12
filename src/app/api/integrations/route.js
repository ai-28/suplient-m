import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { GoogleCalendarService, ZoomService, TeamsService } from '@/app/lib/services/IntegrationService';

// GET /api/integrations - Get coach's integrations
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;
        const integrations = await integrationRepo.getCoachIntegrations(coachId);

        // Remove sensitive data
        const safeIntegrations = integrations.map(integration => ({
            id: integration.id,
            platform: integration.platform,
            platformEmail: integration.platformEmail,
            platformName: integration.platformName,
            isActive: integration.isActive,
            settings: integration.settings,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt
        }));

        return NextResponse.json({
            message: 'Integrations fetched successfully',
            integrations: safeIntegrations
        });
    } catch (error) {
        console.error('Get integrations error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch integrations' },
            { status: 500 }
        );
    }
}

// POST /api/integrations - Connect a new integration
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { platform, accessToken, refreshToken, expiresAt, scope, platformUserId, platformEmail, platformName, settings } = body;

        if (!platform || !accessToken) {
            return NextResponse.json(
                { error: 'Platform and access token are required' },
                { status: 400 }
            );
        }

        const coachId = session.user.id;
        const integrationData = {
            coachId,
            platform,
            accessToken,
            refreshToken,
            tokenExpiresAt: expiresAt ? new Date(expiresAt) : null,
            scope,
            platformUserId,
            platformEmail,
            platformName,
            settings: settings || {}
        };

        const integration = await integrationRepo.upsertCoachIntegration(integrationData);

        return NextResponse.json({
            message: 'Integration connected successfully',
            integration: {
                id: integration.id,
                platform: integration.platform,
                platformEmail: integration.platformEmail,
                platformName: integration.platformName,
                isActive: integration.isActive,
                settings: integration.settings,
                createdAt: integration.createdAt
            }
        });
    } catch (error) {
        console.error('Connect integration error:', error);
        return NextResponse.json(
            { error: 'Failed to connect integration' },
            { status: 500 }
        );
    }
}

// DELETE /api/integrations - Disconnect an integration
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');

        if (!platform) {
            return NextResponse.json(
                { error: 'Platform is required' },
                { status: 400 }
            );
        }

        const coachId = session.user.id;
        const integration = await integrationRepo.deactivateIntegration(coachId, platform);

        if (!integration) {
            return NextResponse.json(
                { error: 'Integration not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Integration disconnected successfully',
            integration: {
                id: integration.id,
                platform: integration.platform,
                isActive: integration.isActive
            }
        });
    } catch (error) {
        console.error('Disconnect integration error:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
        );
    }
}
