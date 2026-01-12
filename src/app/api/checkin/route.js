import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { userStatsRepo } from '@/app/lib/db/userStatsRepo';

export async function POST(request) {
    try {
        // Get the current session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse the request body
        const body = await request.json();

        // Extract data from request body
        const {
            goalScores = {},
            habitScores = {},
            notes,
            date
        } = body;

        // Validate goalScores and habitScores if provided
        if (goalScores && typeof goalScores === 'object') {
            for (const [goalId, score] of Object.entries(goalScores)) {
                if (typeof score !== 'number' || score < 0 || score > 5) {
                    return NextResponse.json(
                        { error: `Invalid score for goal ${goalId}. Must be a number between 0 and 5` },
                        { status: 400 }
                    );
                }
            }
        }

        if (habitScores && typeof habitScores === 'object') {
            for (const [habitId, score] of Object.entries(habitScores)) {
                if (typeof score !== 'number' || score < 0 || score > 5) {
                    return NextResponse.json(
                        { error: `Invalid score for habit ${habitId}. Must be a number between 0 and 5` },
                        { status: 400 }
                    );
                }
            }
        }


        // Get the client ID from the user session
        // Assuming the user is a client, we need to get their client record
        const clientResult = await sql`
      SELECT id FROM "Client" 
      WHERE "userId" = ${session.user.id}
      LIMIT 1
    `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client record not found' },
                { status: 404 }
            );
        }

        const clientId = clientResult[0].id;

        // Convert goalScores and habitScores to JSONB
        const goalScoresJson = JSON.stringify(goalScores || {});
        const habitScoresJson = JSON.stringify(habitScores || {});

        // Use PostgreSQL UPSERT (INSERT ... ON CONFLICT) for atomic operation
        // This handles multiple saves on the same date automatically
        // Uses JSONB fields for goals and habits
        const result = await sql`
      INSERT INTO "CheckIn" (
        "clientId",
        "goalScores",
        "habitScores",
        notes,
        date
      ) VALUES (
        ${clientId},
        ${goalScoresJson}::jsonb,
        ${habitScoresJson}::jsonb,
        ${notes || null},
        ${date}
      )
      ON CONFLICT ("clientId", date) 
      DO UPDATE SET
        "goalScores" = EXCLUDED."goalScores",
        "habitScores" = EXCLUDED."habitScores",
        notes = EXCLUDED.notes,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING id, 
        CASE 
          WHEN xmax = 0 THEN 'inserted'
          ELSE 'updated'
        END as operation
    `;

        const operation = result[0].operation;
        const checkInId = result[0].id;


        // Record engagement activity and update streak
        try {
            await userStatsRepo.addEngagementActivity(session.user.id, 'checkin', 1, date);
            console.log('Engagement activity recorded', session.user.id, 'checkin', 1, date);
            await userStatsRepo.updateDailyStreak(session.user.id, date);
        } catch (engagementError) {
            console.error('Error recording engagement activity:', engagementError);
            // Don't fail the check-in if engagement tracking fails
        }

        // Fetch latest user stats to confirm initialization/update
        let updatedUserStats = null;
        try {
            updatedUserStats = await userStatsRepo.getUserStats(session.user.id);
        } catch (statsError) {
            console.error('Error fetching updated user stats after check-in:', statsError);
        }

        // Create activity for daily check-in
        try {
            const { activityHelpers } = await import('@/app/lib/db/activitySchema');
            await activityHelpers.createDailyCheckinActivity(session.user.id, clientId, {
                id: checkInId,
                responses: {
                    goalScores,
                    habitScores,
                    notes
                },
                mood: notes || 'Daily check-in completed'
            }, {
                nameProvided: true,
                userName: session.user.name || null
            });
        } catch (activityError) {
            console.error('❌ Error creating daily check-in activity:', activityError);
            // Don't fail the check-in if activity creation fails
        }

        // Create notification for coach
        try {
            // Get the coach's ID from the client record

            const clientResult = await sql`
                SELECT c."coachId", u.name as coachName
                FROM "Client" c
                JOIN "User" u ON u.id = c."coachId"
                WHERE c.id = ${clientId}
            `;


            if (clientResult.length > 0) {
                const coachId = clientResult[0].coachId;
                const coachName = clientResult[0].coachName;


                const { NotificationService } = require('@/app/lib/services/NotificationService');
                await NotificationService.notifyDailyCheckin(clientId, coachId, session.user.name);
            } else {
                console.error('❌ Could not find coach for client:', clientId);
            }
        } catch (notificationError) {
            console.error('❌ Error creating daily check-in notification:', notificationError);

            // Don't fail the check-in if notification creation fails
        }

        return NextResponse.json({
            message: operation === 'inserted' ? 'Check-in saved successfully' : 'Check-in updated successfully',
            checkInId: checkInId,
            isUpdate: operation === 'updated',
            operation: operation,
            checkIn: {
                id: checkInId,
                date: date
            },
            userStats: updatedUserStats
        });

    } catch (error) {
        console.error('Error saving check-in:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// GET method to retrieve check-in data
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        // Get the client ID
        const clientResult = await sql`
      SELECT id FROM "Client" 
      WHERE "userId" = ${session.user.id}
      LIMIT 1
    `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client record not found' },
                { status: 404 }
            );
        }

        const clientId = clientResult[0].id;

        if (date) {
            // Get check-in for specific date
            const result = await sql`
        SELECT * FROM "CheckIn" 
        WHERE "clientId" = ${clientId} AND date = ${date}
        LIMIT 1
      `;

            if (result.length === 0) {
                return NextResponse.json({ checkIn: null });
            }

            return NextResponse.json({ checkIn: result[0] });
        } else {
            // Get all check-ins for the client
            const result = await sql`
        SELECT * FROM "CheckIn" 
        WHERE "clientId" = ${clientId}
        ORDER BY date DESC
        LIMIT 30
      `;

            return NextResponse.json({ checkIns: result });
        }

    } catch (error) {
        console.error('Error retrieving check-ins:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
