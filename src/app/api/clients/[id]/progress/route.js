import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/clients/[id]/progress - Get real client progress data
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: clientId } = await params;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        // Verify coach has access to this client
        const clientResult = await sql`
            SELECT c.id, c."userId", c.name, c.status
            FROM "Client" c
            WHERE c.id = ${clientId} AND c."coachId" = ${session.user.id}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
        }

        const client = clientResult[0];

        // Get real data for the last 8 weeks
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks ago

        // Get active goals and habits for this client
        const goalsResult = await sql`
            SELECT id, name, "isActive"
            FROM "Goal"
            WHERE "clientId" = ${clientId} AND "isActive" = true
            ORDER BY "order" ASC, "createdAt" ASC
        `;

        const habitsResult = await sql`
            SELECT id, name, "isActive"
            FROM "Habit"
            WHERE "clientId" = ${clientId} AND "isActive" = true
            ORDER BY "order" ASC, "createdAt" ASC
        `;

        const activeGoals = goalsResult || [];
        const activeHabits = habitsResult || [];

        // Helper function to normalize ID for matching
        const normalizeId = (id) => String(id).toLowerCase();

        // Helper function to get score from JSONB with ID matching
        const getScoreFromJsonb = (jsonb, targetId) => {
            if (!jsonb || typeof jsonb !== 'object') return undefined;

            const targetIdStr = String(targetId);
            const targetIdLower = normalizeId(targetId);

            // Try direct match
            if (jsonb[targetId] !== undefined) return jsonb[targetId];
            if (jsonb[targetIdStr] !== undefined) return jsonb[targetIdStr];
            if (jsonb[targetIdLower] !== undefined) return jsonb[targetIdLower];

            // Try case-insensitive match
            const keys = Object.keys(jsonb);
            const matchingKey = keys.find(key => normalizeId(key) === targetIdLower);
            if (matchingKey !== undefined) return jsonb[matchingKey];

            return undefined;
        };

        // 1. Get daily check-ins for wellbeing calculation
        const checkInsResult = await sql`
            SELECT 
                date,
                "goalScores",
                "habitScores"
            FROM "CheckIn"
            WHERE "clientId" = ${clientId}
            AND date >= ${eightWeeksAgo.toISOString().split('T')[0]}
            ORDER BY date ASC
        `;

        // 2. Get task completions for performance calculation
        const taskCompletionsResult = await sql`
            SELECT 
                tc."completedAt",
                t.title,
                t."taskType"
            FROM "TaskCompletion" tc
            JOIN "Task" t ON tc."taskId" = t.id
            WHERE tc."clientId" = ${clientId}
            AND tc."completedAt" >= ${eightWeeksAgo}
            ORDER BY tc."completedAt" ASC
        `;

        // 3. Get session attendance for performance calculation
        const sessionAttendanceResult = await sql`
            SELECT 
                s."sessionDate",
                s.status,
                s."sessionType"
            FROM "Session" s
            WHERE (s."clientId" = ${clientId} OR ${clientId} = ANY(
                SELECT unnest(g."selectedMembers")
                FROM "Group" g
                WHERE g.id = s."groupId"
            ))
            AND s."sessionDate" >= ${eightWeeksAgo}
            ORDER BY s."sessionDate" ASC
        `;

        // 4. Get resource views for engagement tracking (using ResourceCompletion)
        const resourceViewsResult = await sql`
            SELECT 
                rc."completedAt" as date,
                rc."resourceId",
                r.title
            FROM "ResourceCompletion" rc
            JOIN "Resource" r ON rc."resourceId" = r.id
            WHERE rc."clientId" = ${clientId}
            AND rc."completedAt" >= ${eightWeeksAgo}
            ORDER BY rc."completedAt" ASC
        `;

        // Process data into weekly format
        const weeklyData = [];
        const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];

        for (let i = 0; i < 8; i++) {
            const weekStart = new Date(eightWeeksAgo);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Calculate wellbeing score from check-ins
            const weekCheckIns = checkInsResult.filter(checkin => {
                const checkinDate = new Date(checkin.date);
                return checkinDate >= weekStart && checkinDate <= weekEnd;
            });

            let wellbeingScore = 0; // No data = 0 score
            if (weekCheckIns.length > 0 && (activeGoals.length > 0 || activeHabits.length > 0)) {
                // Calculate average scores for all active goals (positive factors)
                const goalScoreSums = {};
                const goalScoreCounts = {};

                // Calculate average scores for all active habits (negative factors)
                const habitScoreSums = {};
                const habitScoreCounts = {};

                weekCheckIns.forEach(checkin => {
                    let goalScores = checkin.goalScores || {};
                    let habitScores = checkin.habitScores || {};

                    // Parse JSONB if it's a string
                    if (typeof goalScores === 'string') {
                        try {
                            goalScores = JSON.parse(goalScores);
                        } catch (e) {
                            console.error('Error parsing goalScores in progress API:', e);
                            goalScores = {};
                        }
                    }
                    if (typeof habitScores === 'string') {
                        try {
                            habitScores = JSON.parse(habitScores);
                        } catch (e) {
                            console.error('Error parsing habitScores in progress API:', e);
                            habitScores = {};
                        }
                    }

                    // Sum goal scores
                    activeGoals.forEach(goal => {
                        const score = getScoreFromJsonb(goalScores, goal.id);
                        if (score !== undefined && typeof score === 'number') {
                            const goalIdKey = normalizeId(goal.id);
                            if (!goalScoreSums[goalIdKey]) {
                                goalScoreSums[goalIdKey] = 0;
                                goalScoreCounts[goalIdKey] = 0;
                            }
                            goalScoreSums[goalIdKey] += score;
                            goalScoreCounts[goalIdKey]++;
                        }
                    });

                    // Sum habit scores
                    activeHabits.forEach(habit => {
                        const score = getScoreFromJsonb(habitScores, habit.id);
                        if (score !== undefined && typeof score === 'number') {
                            const habitIdKey = normalizeId(habit.id);
                            if (!habitScoreSums[habitIdKey]) {
                                habitScoreSums[habitIdKey] = 0;
                                habitScoreCounts[habitIdKey] = 0;
                            }
                            habitScoreSums[habitIdKey] += score;
                            habitScoreCounts[habitIdKey]++;
                        }
                    });
                });

                // Calculate averages for goals
                const avgGoalScores = [];
                Object.keys(goalScoreSums).forEach(goalIdKey => {
                    if (goalScoreCounts[goalIdKey] > 0) {
                        avgGoalScores.push(goalScoreSums[goalIdKey] / goalScoreCounts[goalIdKey]);
                    }
                });

                // Calculate averages for habits
                const avgHabitScores = [];
                Object.keys(habitScoreSums).forEach(habitIdKey => {
                    if (habitScoreCounts[habitIdKey] > 0) {
                        avgHabitScores.push(habitScoreSums[habitIdKey] / habitScoreCounts[habitIdKey]);
                    }
                });

                // Calculate wellbeing: positive factors (goals) - negative factors (habits), normalized to 1-10
                const positiveScore = avgGoalScores.length > 0
                    ? avgGoalScores.reduce((sum, score) => sum + score, 0) / avgGoalScores.length
                    : 0;

                const negativeScore = avgHabitScores.length > 0
                    ? avgHabitScores.reduce((sum, score) => sum + score, 0) / avgHabitScores.length
                    : 0;

                // If no goals tracked, use default positive score of 3 (middle of 0-5 scale)
                const finalPositiveScore = avgGoalScores.length > 0 ? positiveScore : 3;

                // If no habits tracked, use default negative score of 2.5 (middle of 0-5 scale)
                const finalNegativeScore = avgHabitScores.length > 0 ? negativeScore : 2.5;

                wellbeingScore = Math.max(1, Math.min(10, finalPositiveScore - (finalNegativeScore - 2.5) * 0.5));
            }

            // Calculate performance score using completion rates
            const weekTasks = taskCompletionsResult.filter(task => {
                const taskDate = new Date(task.completedAt);
                return taskDate >= weekStart && taskDate <= weekEnd;
            });

            const weekSessions = sessionAttendanceResult.filter(session => {
                const sessionDate = new Date(session.sessionDate);
                return sessionDate >= weekStart && sessionDate <= weekEnd;
            });

            const weekResources = resourceViewsResult.filter(resource => {
                const resourceDate = new Date(resource.date);
                return resourceDate >= weekStart && resourceDate <= weekEnd;
            });

            // Get total available tasks for this week (due during this week)
            const weekAvailableTasks = await sql`
                SELECT COUNT(*) as total
                FROM "Task" t
                WHERE t."clientId" = ${clientId}
                AND t."dueDate" >= ${weekStart.toISOString().split('T')[0]}
                AND t."dueDate" <= ${weekEnd.toISOString().split('T')[0]}
            `;

            // Get total available resources for this client (all assigned resources)
            const totalAvailableResources = await sql`
                SELECT COUNT(*) as total
                FROM "Resource" r
                WHERE ${clientId} = ANY(r."clientIds")
                OR EXISTS (
                    SELECT 1 FROM "Group" g 
                    WHERE g.id = ANY(r."groupIds") 
                    AND ${clientId} = ANY(g."selectedMembers")
                )
            `;

            // Performance calculation using completion rates (0-10 scale)
            // Only include components that have available items (non-zero totals)
            // Dynamically adjust weights based on available components

            const hasSessions = weekSessions.length > 0;
            const hasTasks = weekAvailableTasks[0]?.total > 0;
            const hasResources = totalAvailableResources[0]?.total > 0;

            // Calculate rates only for available components
            const attendanceRate = hasSessions ?
                (weekSessions.filter(s => s.status === 'completed').length / weekSessions.length) * 10 : null;

            const taskCompletionRate = hasTasks ?
                (weekTasks.length / weekAvailableTasks[0].total) * 10 : null;

            const resourceCompletionRate = hasResources ?
                (weekResources.length / totalAvailableResources[0].total) * 10 : null;

            // Check-in consistency: assume 7 days per week is ideal (always available)
            const checkInConsistency = Math.min((weekCheckIns.length / 7) * 10, 10);

            // Build weighted components array with their original weights
            const components = [];
            if (attendanceRate !== null) components.push({ value: attendanceRate, weight: 0.3 });
            if (taskCompletionRate !== null) components.push({ value: taskCompletionRate, weight: 0.25 });
            if (resourceCompletionRate !== null) components.push({ value: resourceCompletionRate, weight: 0.25 });
            components.push({ value: checkInConsistency, weight: 0.2 }); // Always include check-ins

            // Calculate total weight of available components
            const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);

            // Calculate weighted average, normalizing weights if some components are missing
            let performanceScore = 0;
            if (totalWeight > 0) {
                performanceScore = components.reduce((sum, comp) => {
                    // Normalize weight proportionally
                    const normalizedWeight = comp.weight / totalWeight;
                    return sum + (comp.value * normalizedWeight);
                }, 0);
            } else {
                // Fallback: if no components available at all, return 0
                performanceScore = 0;
            }

            weeklyData.push({
                week: weeks[i],
                performance: Math.round(performanceScore * 10) / 10,
                wellbeing: Math.round(wellbeingScore * 10) / 10,
                checkIns: weekCheckIns.length,
                tasksCompleted: weekTasks.length,
                sessionsAttended: weekSessions.filter(s => s.status === 'completed').length,
                resourcesViewed: weekResources.length
            });
        }

        // Calculate current metrics (latest week)
        const currentMetrics = weeklyData[weeklyData.length - 1] || { performance: 0, wellbeing: 0 };

        // Calculate additional stats
        const totalCheckIns = checkInsResult.length;
        const totalTasksCompleted = taskCompletionsResult.length;
        const totalSessionsAttended = sessionAttendanceResult.filter(s => s.status === 'completed').length;
        const totalSessionsScheduled = sessionAttendanceResult.length;

        // Calculate journal completion rate based on recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentCheckIns = checkInsResult.filter(checkin =>
            new Date(checkin.date) >= sevenDaysAgo
        ).length;

        const journalCompletionRate = Math.round((recentCheckIns / 7) * 100);

        const sessionAttendanceRate = totalSessionsScheduled > 0 ?
            Math.round((totalSessionsAttended / totalSessionsScheduled) * 100) : 0;

        return NextResponse.json({
            clientId: client.id,
            clientName: client.name,
            currentMetrics: {
                performance: currentMetrics.performance,
                wellbeing: currentMetrics.wellbeing
            },
            weeklyData,
            stats: {
                journalCompletionRate,
                sessionAttendanceRate,
                totalCheckIns,
                totalTasksCompleted,
                totalSessionsAttended,
                totalSessionsScheduled
            }
        });

    } catch (error) {
        console.error('Get client progress error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
