import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/groups/[id]/progress - Get real group progress data
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Verify coach has access to this group
        const groupResult = await sql`
            SELECT g.id, g.name, g."selectedMembers", g."coachId"
            FROM "Group" g
            WHERE g.id = ${groupId} AND g."coachId" = ${session.user.id}
            LIMIT 1
        `;

        if (groupResult.length === 0) {
            return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
        }

        const group = groupResult[0];
        const memberIds = group.selectedMembers || [];

        if (memberIds.length === 0) {
            return NextResponse.json({
                groupId: group.id,
                groupName: group.name,
                weeklyAverages: [],
                members: [],
                stats: {
                    totalMembers: 0,
                    activeMembers: 0,
                    totalCheckIns: 0,
                    totalTasksCompleted: 0,
                    totalSessionsAttended: 0,
                    totalSessionsScheduled: 0
                }
            });
        }

        // Get real data for the last 8 weeks
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks ago

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

        // Helper function to calculate wellbeing from check-ins
        const calculateWellbeingFromCheckIns = (checkIns, goals, habits) => {
            if (checkIns.length === 0 || (goals.length === 0 && habits.length === 0)) {
                return 0;
            }

            const goalScoreSums = {};
            const goalScoreCounts = {};
            const habitScoreSums = {};
            const habitScoreCounts = {};

            checkIns.forEach(checkin => {
                let goalScores = checkin.goalScores || {};
                let habitScores = checkin.habitScores || {};

                // Parse JSONB if it's a string
                if (typeof goalScores === 'string') {
                    try {
                        goalScores = JSON.parse(goalScores);
                    } catch (e) {
                        goalScores = {};
                    }
                }
                if (typeof habitScores === 'string') {
                    try {
                        habitScores = JSON.parse(habitScores);
                    } catch (e) {
                        habitScores = {};
                    }
                }

                // Sum goal scores
                goals.forEach(goal => {
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
                habits.forEach(habit => {
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
                : 3; // Default if no goals tracked
            
            const negativeScore = avgHabitScores.length > 0 
                ? avgHabitScores.reduce((sum, score) => sum + score, 0) / avgHabitScores.length 
                : 2.5; // Default if no habits tracked

            return Math.max(1, Math.min(10, positiveScore - (negativeScore - 2.5) * 0.5));
        };

        // Get all active goals and habits from all members in the group, grouped by client (once, before the loop)
        const allGoalsByClient = await sql`
            SELECT "clientId", id, name
            FROM "Goal"
            WHERE "clientId" = ANY(${memberIds}) AND "isActive" = true
        `;
        const allHabitsByClient = await sql`
            SELECT "clientId", id, name
            FROM "Habit"
            WHERE "clientId" = ANY(${memberIds}) AND "isActive" = true
        `;

        // Group goals and habits by clientId
        const goalsByClient = {};
        const habitsByClient = {};
        allGoalsByClient.forEach(goal => {
            if (!goalsByClient[goal.clientId]) goalsByClient[goal.clientId] = [];
            goalsByClient[goal.clientId].push(goal);
        });
        allHabitsByClient.forEach(habit => {
            if (!habitsByClient[habit.clientId]) habitsByClient[habit.clientId] = [];
            habitsByClient[habit.clientId].push(habit);
        });

        // Process data into weekly format
        const weeklyAverages = [];
        const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];

        for (let i = 0; i < 8; i++) {
            const weekStart = new Date(eightWeeksAgo);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Get check-ins for all members in this week
            const weekCheckIns = await sql`
                SELECT 
                    c."clientId",
                    c.date,
                    c."goalScores",
                    c."habitScores"
                FROM "CheckIn" c
                WHERE c."clientId" = ANY(${memberIds})
                AND c.date >= ${weekStart.toISOString().split('T')[0]}
                AND c.date <= ${weekEnd.toISOString().split('T')[0]}
            `;

            // Get task completions for all members in this week
            const weekTasks = await sql`
                SELECT 
                    tc."clientId",
                    tc."completedAt"
                FROM "TaskCompletion" tc
                JOIN "Task" t ON tc."taskId" = t.id
                WHERE tc."clientId" = ANY(${memberIds})
                AND tc."completedAt" >= ${weekStart}
                AND tc."completedAt" <= ${weekEnd}
            `;

            // Get sessions for this group in this week
            const weekSessions = await sql`
                SELECT 
                    s."sessionDate",
                    s.status
                FROM "Session" s
                WHERE s."groupId" = ${groupId}
                AND s."sessionDate" >= ${weekStart}
                AND s."sessionDate" <= ${weekEnd}
            `;

            // Get resource views for all members in this week
            const weekResources = await sql`
                SELECT 
                    rc."clientId",
                    rc."completedAt"
                FROM "ResourceCompletion" rc
                WHERE rc."clientId" = ANY(${memberIds})
                AND rc."completedAt" >= ${weekStart}
                AND rc."completedAt" <= ${weekEnd}
            `;

            // Calculate average wellbeing score for the week
            // For group averages, calculate wellbeing for each check-in using that client's goals/habits
            let avgWellbeingScore = 0;
            if (weekCheckIns.length > 0) {
                const wellbeingScores = weekCheckIns.map(checkin => {
                    // Get goals/habits for this specific client
                    const clientGoals = goalsByClient[checkin.clientId] || [];
                    const clientHabits = habitsByClient[checkin.clientId] || [];
                    return calculateWellbeingFromCheckIns([checkin], clientGoals, clientHabits);
                }).filter(score => score > 0); // Filter out 0 scores (no data)
                
                if (wellbeingScores.length > 0) {
                    avgWellbeingScore = wellbeingScores.reduce((sum, score) => sum + score, 0) / wellbeingScores.length;
                }
            }

            // Calculate average performance score for the week
            const attendanceRate = weekSessions.length > 0 ?
                (weekSessions.filter(s => s.status === 'completed').length / weekSessions.length) * 10 : 0;

            const taskCompletionRate = weekTasks.length > 0 ?
                Math.min((weekTasks.length / memberIds.length) * 2, 10) : 0;

            const resourceCompletionRate = weekResources.length > 0 ?
                Math.min((weekResources.length / memberIds.length) * 2, 10) : 0;

            const checkInConsistency = Math.min((weekCheckIns.length / (memberIds.length * 7)) * 10, 10);

            const avgPerformanceScore = (
                attendanceRate * 0.3 +
                taskCompletionRate * 0.25 +
                resourceCompletionRate * 0.25 +
                checkInConsistency * 0.2
            );

            weeklyAverages.push({
                week: weeks[i],
                performance: Math.round(avgPerformanceScore * 10) / 10,
                wellbeing: Math.round(avgWellbeingScore * 10) / 10,
                memberCount: memberIds.length,
                checkIns: weekCheckIns.length,
                tasksCompleted: weekTasks.length,
                sessionsAttended: weekSessions.filter(s => s.status === 'completed').length,
                resourcesViewed: weekResources.length
            });
        }

        // Get member details and calculate individual progress metrics
        const members = [];

        for (const memberId of memberIds) {
            // Get member basic info with avatar
            const memberInfo = await sql`
                SELECT 
                    c.id, 
                    c.name, 
                    c.status,
                    u.avatar
                FROM "Client" c
                LEFT JOIN "User" u ON c."userId" = u.id
                WHERE c.id = ${memberId}
            `;

            if (memberInfo.length === 0) continue;
            const member = memberInfo[0];

            // Generate initials from name
            const initials = member.name
                ? member.name.split(' ').map(n => n[0]).join('').toUpperCase()
                : 'U';

            // Get member's active goals and habits
            const memberGoals = await sql`
                SELECT id, name, "isActive"
                FROM "Goal"
                WHERE "clientId" = ${memberId} AND "isActive" = true
                ORDER BY "order" ASC, "createdAt" ASC
            `;

            const memberHabits = await sql`
                SELECT id, name, "isActive"
                FROM "Habit"
                WHERE "clientId" = ${memberId} AND "isActive" = true
                ORDER BY "order" ASC, "createdAt" ASC
            `;

            // Get member's check-ins for wellbeing calculation
            const memberCheckIns = await sql`
                SELECT 
                    date,
                    "goalScores",
                    "habitScores"
                FROM "CheckIn"
                WHERE "clientId" = ${memberId}
                AND date >= ${eightWeeksAgo.toISOString().split('T')[0]}
                ORDER BY date ASC
            `;

            // Get member's task completions
            const memberTasks = await sql`
                SELECT tc."completedAt"
                FROM "TaskCompletion" tc
                JOIN "Task" t ON tc."taskId" = t.id
                WHERE tc."clientId" = ${memberId}
                AND tc."completedAt" >= ${eightWeeksAgo}
                ORDER BY tc."completedAt" ASC
            `;

            // Get member's sessions (individual and group)
            const memberSessions = await sql`
                SELECT s."sessionDate", s.status
                FROM "Session" s
                WHERE (s."clientId" = ${memberId} OR ${memberId} = ANY(
                    SELECT unnest(g."selectedMembers")
                    FROM "Group" g
                    WHERE g.id = s."groupId"
                ))
                AND s."sessionDate" >= ${eightWeeksAgo}
                ORDER BY s."sessionDate" ASC
            `;

            // Get member's resource views
            const memberResources = await sql`
                SELECT rc."completedAt"
                FROM "ResourceCompletion" rc
                WHERE rc."clientId" = ${memberId}
                AND rc."completedAt" >= ${eightWeeksAgo}
                ORDER BY rc."completedAt" ASC
            `;

            // Calculate wellbeing and performance scores using same logic as ClientProfile
            // Process data into weekly format for this member (same as ClientProfile)
            const memberWeeklyData = [];
            const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];

            for (let i = 0; i < 8; i++) {
                const weekStart = new Date(eightWeeksAgo);
                weekStart.setDate(weekStart.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                // Calculate wellbeing score from check-ins (same as ClientProfile)
                const weekCheckIns = memberCheckIns.filter(checkin => {
                    const checkinDate = new Date(checkin.date);
                    return checkinDate >= weekStart && checkinDate <= weekEnd;
                });

                let wellbeingScore = 0; // No data = 0 score
                if (weekCheckIns.length > 0) {
                    wellbeingScore = calculateWellbeingFromCheckIns(weekCheckIns, memberGoals, memberHabits);
                }

                // Calculate performance score (same as ClientProfile)
                const weekTasks = memberTasks.filter(task => {
                    const taskDate = new Date(task.completedAt);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                });

                const weekSessions = memberSessions.filter(session => {
                    const sessionDate = new Date(session.sessionDate);
                    return sessionDate >= weekStart && sessionDate <= weekEnd;
                });

                const weekResources = memberResources.filter(resource => {
                    const resourceDate = new Date(resource.completedAt);
                    return resourceDate >= weekStart && resourceDate <= weekEnd;
                });

                // Get total available tasks for this week (due during this week)
                const weekAvailableTasks = await sql`
                    SELECT COUNT(*) as total
                    FROM "Task" t
                    WHERE t."clientId" = ${memberId}
                    AND t."dueDate" >= ${weekStart.toISOString().split('T')[0]}
                    AND t."dueDate" <= ${weekEnd.toISOString().split('T')[0]}
                `;

                // Get total available resources for this member (all assigned resources)
                const totalAvailableResources = await sql`
                    SELECT COUNT(*) as total
                    FROM "Resource" r
                    WHERE ${memberId} = ANY(r."clientIds")
                    OR EXISTS (
                        SELECT 1 FROM "Group" g 
                        WHERE g.id = ANY(r."groupIds") 
                        AND ${memberId} = ANY(g."selectedMembers")
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

                memberWeeklyData.push({
                    week: weeks[i],
                    performance: Math.round(performanceScore * 10) / 10,
                    wellbeing: Math.round(wellbeingScore * 10) / 10,
                    checkIns: weekCheckIns.length,
                    tasksCompleted: weekTasks.length,
                    sessionsAttended: weekSessions.filter(s => s.status === 'completed').length,
                    resourcesViewed: weekResources.length
                });
            }

            // Calculate current metrics (latest week) - same as ClientProfile
            const currentMetrics = memberWeeklyData[memberWeeklyData.length - 1] || { performance: 0, wellbeing: 0 };

            members.push({
                id: member.id,
                name: member.name,
                avatar: member.avatar,
                initials: initials,
                status: member.status === "on-hold" || member.status === "inactive" ? "Inactive" : "Active",
                totalCheckIns: memberCheckIns.length,
                totalTasksCompleted: memberTasks.length,
                currentMetrics: {
                    performance: currentMetrics.performance,
                    wellbeing: currentMetrics.wellbeing
                }
            });
        }

        // Calculate overall stats
        const totalCheckIns = members.reduce((sum, m) => sum + m.totalCheckIns, 0);
        const totalTasksCompleted = members.reduce((sum, m) => sum + m.totalTasksCompleted, 0);
        const activeMembers = members.filter(m => m.status === "Active").length;

        // Get session stats
        const sessionStats = await sql`
            SELECT 
                COUNT(*) as totalSessions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as attendedSessions
            FROM "Session" s
            WHERE s."groupId" = ${groupId}
            AND s."sessionDate" >= ${eightWeeksAgo}
        `;

        return NextResponse.json({
            groupId: group.id,
            groupName: group.name,
            weeklyAverages,
            members,
            stats: {
                totalMembers: memberIds.length,
                activeMembers,
                totalCheckIns,
                totalTasksCompleted,
                totalSessionsAttended: parseInt(sessionStats[0]?.attendedsessions) || 0,
                totalSessionsScheduled: parseInt(sessionStats[0]?.totalsessions) || 0
            }
        });

    } catch (error) {
        console.error('Get group progress error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
