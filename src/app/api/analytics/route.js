import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { userStatsRepo } from '@/app/lib/db/userStatsRepo';

// GET /api/analytics - Get analytics data for dashboard
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
        const period = searchParams.get('period') || 'today';
        const dateParam = searchParams.get('date'); // Optional date parameter for specific date

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

        // Helper function to format date in local timezone (YYYY-MM-DD)
        // PostgreSQL DATE type stores just the date part, no timezone conversion needed
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Calculate date range based on period
        // If dateParam is provided, use it directly (it's already in YYYY-MM-DD format from client)
        // Otherwise, use today's date in server's local timezone
        let targetDateStr;
        if (dateParam) {
            // Use the date string directly - it's already in local timezone format from client
            targetDateStr = dateParam;
        } else {
            // Get today's date in server's local timezone
            const today = new Date();
            targetDateStr = formatDateLocal(today);
        }

        // Parse the target date to calculate ranges
        const targetDate = new Date(targetDateStr + 'T12:00:00'); // Use noon to avoid timezone issues
        const endDate = new Date(targetDate);
        const startDate = new Date(targetDate);

        switch (period) {
            case 'today':
                // Use the specific date if provided, otherwise use today
                startDate.setDate(endDate.getDate());
                break;
            case 'week':
                // For week, calculate 7 days ending on targetDate
                startDate.setDate(endDate.getDate() - 6);
                break;
            case 'month':
                // For month, calculate 30 days ending on targetDate
                startDate.setDate(endDate.getDate() - 29);
                break;
        }

        // Format dates in local timezone (no UTC conversion)
        const startDateStr = formatDateLocal(startDate);
        const endDateStr = formatDateLocal(endDate);

        // Fetch active goals from the Goal table to get actual goal data
        const goalsData = await sql`
            SELECT 
                id,
                name,
                icon,
                color,
                "isActive"
            FROM "Goal"
            WHERE "clientId" = ${clientId}
            AND "isActive" = true
            ORDER BY "order" ASC, "createdAt" ASC
        `;

        // Create a mapping of goal ID to goal info
        const goalMapping = {};
        goalsData.forEach(goal => {
            goalMapping[goal.id] = {
                id: goal.id,
                name: goal.name,
                color: goal.color || '#3b82f6',
                icon: goal.icon || '🎯'
            };
        });

        // Calculate goal distribution based on period
        let goalDistribution = [];

        if (period === 'today') {
            // For today, query the specific date directly
            const todayCheckInResult = await sql`
                SELECT "goalScores" FROM "CheckIn" 
                WHERE "clientId" = ${clientId} 
                AND date = ${targetDateStr}
                LIMIT 1
            `;

            if (todayCheckInResult.length > 0) {
                const todayCheckIn = todayCheckInResult[0];
                let goalScores = todayCheckIn.goalScores || {};

                // Parse JSONB if it's a string
                if (typeof goalScores === 'string') {
                    try {
                        goalScores = JSON.parse(goalScores);
                    } catch (e) {
                        console.error('Error parsing goalScores:', e);
                        goalScores = {};
                    }
                }

                // Map goals with their scores from JSONB
                goalDistribution = goalsData.map(goal => {
                    const goalInfo = goalMapping[goal.id];

                    // Try multiple ID formats for matching (UUID object, string, lowercase)
                    const goalIdStr = String(goal.id);
                    const goalIdLower = goalIdStr.toLowerCase();

                    let score = goalScores[goal.id];
                    if (score === undefined) score = goalScores[goalIdStr];
                    if (score === undefined) score = goalScores[goalIdLower];
                    // Also check if keys are stored differently
                    const goalKeys = Object.keys(goalScores);
                    const matchingKey = goalKeys.find(key =>
                        String(key).toLowerCase() === goalIdLower
                    );
                    if (score === undefined && matchingKey) {
                        score = goalScores[matchingKey];
                    }

                    return {
                        id: goal.id,
                        name: goalInfo.name,
                        value: score !== undefined ? score : 0,
                        color: goalInfo.color,
                        icon: goalInfo.icon
                    };
                });
            } else {
                // No check-in for this date, return zeros
                goalDistribution = goalsData.map(goal => {
                    const goalInfo = goalMapping[goal.id];
                    return {
                        id: goal.id,
                        name: goalInfo.name,
                        value: 0,
                        color: goalInfo.color,
                        icon: goalInfo.icon
                    };
                });
            }
        } else if (period === 'week' || period === 'month') {
            // Get check-ins for the specified period
            const checkInsResult = await sql`
                SELECT "goalScores" FROM "CheckIn" 
                WHERE "clientId" = ${clientId} 
                AND date >= ${startDateStr} 
                AND date <= ${endDateStr}
                ORDER BY date DESC
            `;

            // For week/month, calculate averages from JSONB data
            if (checkInsResult.length > 0) {
                // Calculate sum and count for each goal
                // Use normalized string IDs as keys for aggregation
                const goalSums = {};
                const goalCounts = {};

                checkInsResult.forEach(checkIn => {
                    let goalScores = checkIn.goalScores || {};

                    // Parse JSONB if it's a string
                    if (typeof goalScores === 'string') {
                        try {
                            goalScores = JSON.parse(goalScores);
                        } catch (e) {
                            console.error('Error parsing goalScores:', e);
                            goalScores = {};
                        }
                    }

                    // Aggregate scores using normalized (lowercase string) IDs
                    Object.keys(goalScores).forEach(goalIdKey => {
                        const normalizedKey = String(goalIdKey).toLowerCase();
                        if (!goalSums[normalizedKey]) {
                            goalSums[normalizedKey] = 0;
                            goalCounts[normalizedKey] = 0;
                        }
                        goalSums[normalizedKey] += goalScores[goalIdKey];
                        goalCounts[normalizedKey]++;
                    });
                });

                // Map goals with their average scores
                goalDistribution = goalsData.map(goal => {
                    const goalInfo = goalMapping[goal.id];

                    // Try to find matching aggregated data using multiple ID formats
                    const goalIdStr = String(goal.id);
                    const goalIdLower = goalIdStr.toLowerCase();

                    // Find matching key in aggregated data
                    const matchingKey = Object.keys(goalSums).find(key =>
                        key.toLowerCase() === goalIdLower
                    );

                    const sum = matchingKey ? goalSums[matchingKey] : 0;
                    const count = matchingKey ? goalCounts[matchingKey] : 0;
                    const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

                    return {
                        id: goal.id,
                        name: goalInfo.name,
                        value: average,
                        color: goalInfo.color,
                        icon: goalInfo.icon
                    };
                });
            } else {
                // No check-ins in period, return zeros
                goalDistribution = goalsData.map(goal => {
                    const goalInfo = goalMapping[goal.id];
                    return {
                        id: goal.id,
                        name: goalInfo.name,
                        value: 0,
                        color: goalInfo.color,
                        icon: goalInfo.icon
                    };
                });
            }
        }

        // Transform historical data for line chart
        // const historicalData = checkInsResult.map(entry => ({
        //     date: entry.date,
        //     goalScores: {
        //         sleepQuality: entry.sleepQuality,
        //         nutrition: entry.nutrition,
        //         physicalActivity: entry.physicalActivity,
        //         learning: entry.learning,
        //         maintainingRelationships: entry.maintainingRelationships
        //     }
        // }));

        // Get check-in notes for the current date (regardless of period)
        const currentDateCheckIn = await sql`
            SELECT notes FROM "CheckIn" 
            WHERE "clientId" = ${clientId} 
            AND date = ${targetDateStr}
            LIMIT 1
        `;

        const currentDateNotes = currentDateCheckIn.length > 0 ? currentDateCheckIn[0].notes : null;
        // Get user stats (pre-computed values)
        const userStats = await userStatsRepo.getUserStats(session.user.id);
        return NextResponse.json({
            goalDistribution,
            dailyStreak: userStats.daily_streak,
            totalEngagementPoints: userStats.total_points,
            currentDateNotes: currentDateNotes
        });

    } catch (error) {
        console.error('Error retrieving analytics data:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
