import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { integrationRepo } from '@/app/lib/db/integrationSchema';
import { getIntegrationService } from '@/app/lib/services/IntegrationService';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Only clients can create sessions this way
        if (session.user.role !== 'client') {
            return NextResponse.json(
                { error: 'Only clients can use this endpoint' },
                { status: 403 }
            );
        }
        
        const body = await request.json();
        const {
            title,
            description,
            sessionDate,
            sessionTime,
            duration,
            meetingType,
            notes,
            timeZone
        } = body;
        
        // Validate required fields
        if (!title || !sessionDate || !sessionTime) {
            return NextResponse.json(
                { error: 'Title, session date, and session time are required' },
                { status: 400 }
            );
        }
        
        // Get client's coach
        const clientResult = await sql`
            SELECT id, "coachId" FROM "User"
            WHERE id = ${session.user.id} AND role = 'client'
            LIMIT 1
        `;
        
        if (clientResult.length === 0 || !clientResult[0].coachId) {
            return NextResponse.json(
                { error: 'No coach assigned to this client' },
                { status: 404 }
            );
        }
        
        const coachId = clientResult[0].coachId;
        
        // Check if payment is required for 1-to-1 sessions
        const productCheck = await sql`
            SELECT cp."amount", cp."isActive"
            FROM "CoachProduct" cp
            WHERE cp."coachId" = ${coachId}
            AND cp."productType" = 'one_to_one'
            AND cp."isActive" = true
            LIMIT 1
        `;

        // If coach has a one_to_one product with a price, payment is required
        if (productCheck.length > 0 && productCheck[0].amount > 0) {
            // Check for paymentIntentId in request (from successful payment)
            const { paymentIntentId } = body;
            
            if (!paymentIntentId) {
                return NextResponse.json(
                    { 
                        error: 'Payment required',
                        requiresPayment: true,
                        message: 'Payment is required before booking a 1-to-1 session'
                    },
                    { status: 402 } // 402 Payment Required
                );
            }

            // Verify payment exists and is successful
            const paymentCheck = await sql`
                SELECT id, status, "stripePaymentIntentId"
                FROM "ClientPayment"
                WHERE "clientId" = ${session.user.id}
                AND "coachId" = ${coachId}
                AND "productType" = 'one_to_one'
                AND "stripePaymentIntentId" = ${paymentIntentId}
                AND status = 'succeeded'
                LIMIT 1
            `;

            if (paymentCheck.length === 0) {
                return NextResponse.json(
                    { 
                        error: 'Payment verification failed',
                        message: 'Valid payment is required before booking. Please complete the payment first.'
                    },
                    { status: 402 }
                );
            }
        }
        
        // Get client record
        const clientRecord = await sql`
            SELECT id FROM "Client"
            WHERE "userId" = ${session.user.id}
            LIMIT 1
        `;
        
        if (clientRecord.length === 0) {
            return NextResponse.json(
                { error: 'Client record not found' },
                { status: 404 }
            );
        }
        
        const actualClientId = clientRecord[0].id;
        
        // Convert to UTC for storage using client-provided timezone
        const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const localWallTimeToUtc = (dateStr, timeHHMM, tz) => {
            try {
                const [y, m, d] = dateStr.split('-').map(Number);
                const [hh, mm] = timeHHMM.substring(0, 5).split(':').map(Number);
                const utcGuess = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0));
                const fmt = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz || 'UTC',
                    hour12: false,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const parts = Object.fromEntries(fmt.formatToParts(utcGuess).map(p => [p.type, p.value]));
                const renderedLocalMs = Date.UTC(
                    Number(parts.year),
                    Number(parts.month) - 1,
                    Number(parts.day),
                    Number(parts.hour),
                    Number(parts.minute)
                );
                const desiredLocalMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
                const diff = desiredLocalMs - renderedLocalMs;
                return new Date(utcGuess.getTime() + diff);
            } catch {
                return new Date(`${dateStr}T${timeHHMM}:00Z`);
            }
        };
        
        const utcInstant = localWallTimeToUtc(sessionDate, sessionTime, tz);
        const utcDateStr = utcInstant.toISOString().slice(0, 10);
        const utcTimeStr = utcInstant.toISOString().slice(11, 16);
        
        // Create session in database first
        const sessionData = {
            title,
            description: description || null,
            sessionDate: new Date(utcDateStr),
            sessionTime: utcTimeStr,
            duration: duration ? parseInt(duration) : 60,
            sessionType: 'individual',
            coachId,
            clientId: actualClientId,
            groupId: null,
            location: null,
            meetingLink: null,
            status: 'scheduled',
            mood: 'neutral',
            notes: notes || null
        };
        
        const insertResult = await sql`
            INSERT INTO "Session" (
                title, description, "sessionDate", "sessionTime", duration,
                "sessionType", "coachId", "clientId", "groupId", location,
                "meetingLink", status, mood, notes, "createdAt", "updatedAt"
            ) VALUES (
                ${sessionData.title},
                ${sessionData.description},
                ${sessionData.sessionDate},
                ${sessionData.sessionTime},
                ${sessionData.duration},
                ${sessionData.sessionType},
                ${sessionData.coachId},
                ${sessionData.clientId},
                ${sessionData.groupId},
                ${sessionData.location},
                ${sessionData.meetingLink},
                ${sessionData.status},
                ${sessionData.mood},
                ${sessionData.notes},
                NOW(),
                NOW()
            )
            RETURNING id
        `;
        
        const newSessionId = insertResult[0].id;
        
        // Link payment to session if payment was provided
        const { paymentIntentId } = body;
        if (paymentIntentId) {
            try {
                await sql`
                    UPDATE "ClientPayment"
                    SET "sessionId" = ${newSessionId},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "stripePaymentIntentId" = ${paymentIntentId}
                    AND "clientId" = ${session.user.id}
                    AND "coachId" = ${coachId}
                    AND "productType" = 'one_to_one'
                    AND "sessionId" IS NULL
                `;
            } catch (error) {
                console.error('Error linking payment to session:', error);
                // Don't fail the session creation if payment linking fails
            }
        }
        
        // Create meeting link if meeting type is selected (using coach's integration)
        let meetingLink = null;
        let integrationPlatform = 'none';
        
        if (meetingType && meetingType !== 'none') {
            try {
                const platformForAPI = meetingType === 'google_meet' ? 'google_calendar' : meetingType;
                const integration = await integrationRepo.getCoachIntegration(coachId, platformForAPI);
                
                if (!integration || !integration.isActive) {
                    console.warn(`Integration ${platformForAPI} not connected for coach ${coachId}`);
                } else {
                    const integrationService = getIntegrationService(platformForAPI, integration);
                    
                    // Prepare session data for integration
                    const integrationSessionData = {
                        ...sessionData,
                        sessionDate: sessionDate,
                        sessionTime: sessionTime,
                        timeZone: tz, // Include timezone for calendar event creation
                        meetingType: meetingType,
                        integrationSettings: {
                            reminderTime: "24"
                        },
                        attendees: [session.user.email] // Add client email
                    };
                    
                    let meetingResult;
                    if (platformForAPI === 'google_calendar') {
                        meetingResult = await integrationService.createEvent({
                            ...integrationSessionData,
                            platform: 'google_calendar'
                        });
                    } else {
                        meetingResult = await integrationService.createMeeting(integrationSessionData);
                    }
                    
                    if (meetingResult.success) {
                        meetingLink = meetingResult.meetingLink || meetingResult.eventUrl || meetingResult.joinUrl || meetingResult.meetingUrl;
                        integrationPlatform = platformForAPI;
                        
                        // Update session with meeting link
                        await sql`
                            UPDATE "Session"
                            SET "meetingLink" = ${meetingLink},
                                "integrationPlatform" = ${integrationPlatform},
                                "integrationSettings" = ${JSON.stringify(integrationSessionData.integrationSettings || {})},
                                "updatedAt" = NOW()
                            WHERE id = ${newSessionId}
                        `;
                    }
                }
            } catch (error) {
                console.error('Error creating meeting link:', error);
                // Don't fail the session creation if meeting link fails
            }
        }
        
        // Create notification for coach
        try {
            await sql`
                INSERT INTO "Notification" (
                    "userId", type, title, message, data, priority, "createdAt"
                ) VALUES (
                    ${coachId},
                    'system',
                    'New Session Booked',
                    ${`Client has booked a session "${title}" for ${sessionDate} at ${sessionTime}`},
                    ${JSON.stringify({
                        sessionId: newSessionId,
                        sessionTitle: title,
                        sessionDate: sessionDate,
                        sessionTime: sessionTime
                    })},
                    'high',
                    NOW()
                )
            `;
        } catch (notificationError) {
            console.error('Failed to create notification:', notificationError);
        }
        
        return NextResponse.json({
            success: true,
            session: {
                id: newSessionId,
                title,
                sessionDate,
                sessionTime,
                meetingLink
            }
        });
    } catch (error) {
        console.error('Error creating client session:', error);
        return NextResponse.json(
            { error: 'Failed to create session', details: error.message },
            { status: 500 }
        );
    }
}

