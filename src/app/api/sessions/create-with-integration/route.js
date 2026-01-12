import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { getIntegrationService } from '@/app/lib/services/IntegrationService';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, sessionData, platforms } = await request.json();

        if (!sessionId || !sessionData || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        const coachId = session.user.id;
        const results = {};
        let meetingLink = null;
        let integrationPlatform = 'none';

        for (const platform of platforms) {

            try {
                const integration = await integrationRepo.getCoachIntegration(coachId, platform);

                if (!integration || !integration.isActive) {
                    results[platform] = { success: false, error: `${platform} integration not found or inactive` };
                    continue;
                }

                const integrationService = getIntegrationService(platform, integration);
                let meetingResult;

                if (platform === 'google_calendar') {
                    // Pass platform to createEvent so it knows to create Google Meet link
                    meetingResult = await integrationService.createEvent({
                        ...sessionData,
                        platform: 'google_calendar'
                    });
                } else {
                    meetingResult = await integrationService.createMeeting(sessionData);
                }

                if (meetingResult.success) {
                    // Store the meeting link and platform info for the session
                    meetingLink = meetingResult.meetingLink || meetingResult.eventUrl || meetingResult.joinUrl || meetingResult.meetingUrl;
                    integrationPlatform = platform;

                    results[platform] = {
                        success: true,
                        meetingId: meetingResult.eventId || meetingResult.meetingId,
                        meetingLink: meetingLink,
                        password: meetingResult.password || null,
                        data: meetingResult
                    };
                } else {
                    results[platform] = {
                        success: false,
                        error: meetingResult.error || 'Failed to create meeting'
                    };
                    console.error(`❌ ${platform} meeting creation failed:`, meetingResult);
                }

            } catch (platformError) {
                console.error(`Error creating ${platform} meeting:`, platformError);
                results[platform] = {
                    success: false,
                    error: platformError.message
                };
            }
        }

        // Update the session with meeting link and integration platform
        if (meetingLink) {
            try {
                await sql`
                    UPDATE "Session"
                    SET "meetingLink" = ${meetingLink},
                        "integrationPlatform" = ${integrationPlatform},
                        "integrationSettings" = ${JSON.stringify(sessionData.integrationSettings || {})},
                        "updatedAt" = NOW()
                    WHERE id = ${sessionId}
                `;
            } catch (updateError) {
                console.error('❌ Error updating session with meeting link:', updateError);
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Error in create-with-integration API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}