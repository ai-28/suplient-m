import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';

// POST /api/integrations/reconnect - Reconnect/refresh an integration
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { platform } = await request.json();

        if (!platform) {
            return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
        }

        const coachId = session.user.id;

        // Check if integration exists (optional - allow reconnection even if no existing integration)
        let existingIntegration = null;
        try {
            existingIntegration = await integrationRepo.getCoachIntegration(coachId, platform);
        } catch (dbError) {
            console.log(`Database error checking ${platform} integration:`, dbError.message);
            // Continue with reconnection even if database check fails
        }

        // Generate reconnection URL based on platform
        let reconnectUrl;

        switch (platform) {
            case 'google_calendar':
                reconnectUrl = `${process.env.NEXTAUTH_URL}/api/integrations/oauth/google/authorize?callbackUrl=${encodeURIComponent('/coach/sessions')}`;
                break;
            case 'zoom':
                reconnectUrl = `${process.env.NEXTAUTH_URL}/api/integrations/oauth/zoom/authorize?callbackUrl=${encodeURIComponent('/coach/sessions')}`;
                break;
            case 'teams':
                reconnectUrl = `${process.env.NEXTAUTH_URL}/api/integrations/oauth/teams/authorize?callbackUrl=${encodeURIComponent('/coach/sessions')}`;
                break;
            default:
                return NextResponse.json({
                    error: 'Unsupported platform'
                }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            reconnectUrl,
            message: existingIntegration
                ? `Please reconnect your ${platform} integration to get the latest permissions`
                : `Please connect your ${platform} integration`
        });

    } catch (error) {
        console.error('Integration reconnect error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/integrations/reconnect - Disconnect an integration
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { platform } = await request.json();

        if (!platform) {
            return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
        }

        const coachId = session.user.id;

        // Deactivate the integration
        try {
            const result = await integrationRepo.deactivateIntegration(coachId, platform);

            if (!result) {
                return NextResponse.json({
                    error: `${platform} integration not found`
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: `${platform} integration disconnected successfully`
            });
        } catch (dbError) {
            console.error(`Database error disconnecting ${platform} integration:`, dbError.message);
            return NextResponse.json({
                error: `Failed to disconnect ${platform} integration due to database error`,
                details: dbError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Integration disconnect error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
