import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// Helper function to get client ID from session
async function getClientId(session) {
    const clientResult = await sql`
        SELECT id FROM "Client" WHERE "userId" = ${session.user.id}
    `;

    if (clientResult.length === 0) {
        return null;
    }

    return clientResult[0].id;
}

// Helper function to get latest check-in scores
async function getLatestCheckInScores(clientId) {
    const latestCheckIn = await sql`
        SELECT 
            "goalScores",
            "habitScores",
            date
        FROM "CheckIn"
        WHERE "clientId" = ${clientId}
        ORDER BY date DESC
        LIMIT 1
    `;

    return latestCheckIn.length > 0 ? latestCheckIn[0] : null;
}

// Helper function to get average scores for the last 30 days
// Note: This function now calculates averages from JSONB fields
async function getAverageScores(clientId) {
    // Get all check-ins from the last 30 days
    const checkIns = await sql`
        SELECT 
            "goalScores",
            "habitScores"
        FROM "CheckIn"
        WHERE "clientId" = ${clientId}
        AND date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    if (checkIns.length === 0) {
        return null;
    }

    // Calculate averages from JSONB data
    const goalScoreSums = {};
    const habitScoreSums = {};
    const goalScoreCounts = {};
    const habitScoreCounts = {};

    checkIns.forEach(checkIn => {
        const goalScores = checkIn.goalScores || {};
        const habitScores = checkIn.habitScores || {};

        // Sum up goal scores
        Object.keys(goalScores).forEach(goalId => {
            if (!goalScoreSums[goalId]) {
                goalScoreSums[goalId] = 0;
                goalScoreCounts[goalId] = 0;
            }
            goalScoreSums[goalId] += goalScores[goalId];
            goalScoreCounts[goalId]++;
        });

        // Sum up habit scores
        Object.keys(habitScores).forEach(habitId => {
            if (!habitScoreSums[habitId]) {
                habitScoreSums[habitId] = 0;
                habitScoreCounts[habitId] = 0;
            }
            habitScoreSums[habitId] += habitScores[habitId];
            habitScoreCounts[habitId]++;
        });
    });

    // Calculate averages
    const avgGoalScores = {};
    const avgHabitScores = {};

    Object.keys(goalScoreSums).forEach(goalId => {
        avgGoalScores[goalId] = goalScoreSums[goalId] / goalScoreCounts[goalId];
    });

    Object.keys(habitScoreSums).forEach(habitId => {
        avgHabitScores[habitId] = habitScoreSums[habitId] / habitScoreCounts[habitId];
    });

    return {
        goalScores: avgGoalScores,
        habitScores: avgHabitScores
    };
}

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = await getClientId(session);
        if (!clientId) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // Fetch goals from database
        const goalsData = await sql`
            SELECT 
                id,
                name,
                icon,
                color,
                "isActive",
                "isCustom",
                "isDefault",
                "order",
                "createdAt",
                "updatedAt"
            FROM "Goal"
            WHERE "clientId" = ${clientId}
            ORDER BY "order" ASC, "createdAt" ASC
        `;

        // Fetch habits from database
        const habitsData = await sql`
            SELECT 
                id,
                name,
                icon,
                color,
                "isActive",
                "isCustom",
                "isDefault",
                "order",
                "createdAt",
                "updatedAt"
            FROM "Habit"
            WHERE "clientId" = ${clientId}
            ORDER BY "order" ASC, "createdAt" ASC
        `;

        // Get latest check-in scores
        const latestCheckIn = await getLatestCheckInScores(clientId);
        const averageScores = await getAverageScores(clientId);

        // Get goal scores from latest check-in (use JSON field if available, fallback to legacy columns)
        const goalScores = latestCheckIn?.goalScores || {};
        const habitScores = latestCheckIn?.habitScores || {};

        // Map goals with scores
        const goals = goalsData.map(goal => {
            let currentScore = 3;
            let averageScore = 3;

            // Get score from JSON field
            if (goalScores && goalScores[goal.id] !== undefined) {
                currentScore = goalScores[goal.id];
            }

            // Get average score from calculated averages
            if (averageScores && averageScores.goalScores && averageScores.goalScores[goal.id] !== undefined) {
                averageScore = Math.round(averageScores.goalScores[goal.id] * 10) / 10; // Round to 1 decimal
            }

            return {
                id: goal.id,
                name: goal.name,
                icon: goal.icon || '🎯',
                color: goal.color || '#3B82F6',
                isActive: goal.isActive,
                isCustom: goal.isCustom,
                isDefault: goal.isDefault,
                currentScore,
                averageScore
            };
        });

        // Map habits with scores
        const habits = habitsData.map(habit => {
            let currentScore = 2;
            let averageScore = 2;

            // Get score from JSON field
            if (habitScores && habitScores[habit.id] !== undefined) {
                currentScore = habitScores[habit.id];
            }

            // Get average score from calculated averages
            if (averageScores && averageScores.habitScores && averageScores.habitScores[habit.id] !== undefined) {
                averageScore = Math.round(averageScores.habitScores[habit.id] * 10) / 10; // Round to 1 decimal
            }

            return {
                id: habit.id,
                name: habit.name,
                icon: habit.icon || '📱',
                color: habit.color || '#EF4444',
                isActive: habit.isActive,
                isCustom: habit.isCustom,
                isDefault: habit.isDefault,
                currentScore,
                averageScore
            };
        });

        // Get total check-ins count
        const checkInCount = await sql`
            SELECT COUNT(*) as total_checkins
            FROM "CheckIn"
            WHERE "clientId" = ${clientId}
        `;

        return NextResponse.json({
            success: true,
            goals,
            badHabits: habits,
            totalCheckIns: checkInCount[0]?.total_checkins || 0,
            lastCheckInDate: latestCheckIn?.date || null
        });

    } catch (error) {
        console.error('Error fetching client goals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch goals data' },
            { status: 500 }
        );
    }
}

// POST - Create a new custom goal or habit
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = await getClientId(session);
        if (!clientId) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const body = await request.json();
        const { type, name, icon, color } = body;

        if (!type || !name) {
            return NextResponse.json(
                { error: 'Type and name are required' },
                { status: 400 }
            );
        }

        if (type !== 'goal' && type !== 'habit') {
            return NextResponse.json(
                { error: 'Type must be either "goal" or "habit"' },
                { status: 400 }
            );
        }

        // Get the highest order value for this client
        const tableName = type === 'goal' ? 'Goal' : 'Habit';
        const maxOrderResult = await sql`
            SELECT COALESCE(MAX("order"), 0) as max_order
            FROM ${sql(tableName)}
            WHERE "clientId" = ${clientId}
        `;
        const nextOrder = (maxOrderResult[0]?.max_order || 0) + 1;

        // Insert the new goal or habit
        const result = await sql`
            INSERT INTO ${sql(tableName)} (
                "clientId",
                name,
                icon,
                color,
                "isActive",
                "isCustom",
                "isDefault",
                "order"
            ) VALUES (
                ${clientId},
                ${name},
                ${icon || (type === 'goal' ? '🎯' : '📱')},
                ${color || (type === 'goal' ? '#3B82F6' : '#EF4444')},
                true,
                true,
                false,
                ${nextOrder}
            )
            RETURNING *
        `;

        return NextResponse.json({
            success: true,
            [type]: result[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating goal/habit:', error);
        return NextResponse.json(
            { error: 'Failed to create goal/habit' },
            { status: 500 }
        );
    }
}

// PUT - Update a goal or habit (toggle active, update details)
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = await getClientId(session);
        if (!clientId) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const body = await request.json();
        const { id, type, isActive, name, description, icon, color, category, order, orders } = body;

        if (!id || !type) {
            return NextResponse.json(
                { error: 'ID and type are required' },
                { status: 400 }
            );
        }

        if (type !== 'goal' && type !== 'habit') {
            return NextResponse.json(
                { error: 'Type must be either "goal" or "habit"' },
                { status: 400 }
            );
        }

        const tableName = type === 'goal' ? 'Goal' : 'Habit';

        // Handle bulk order update
        if (orders && Array.isArray(orders)) {
            const updatePromises = orders.map(({ id: itemId, order: itemOrder }) => {
                return sql`
                    UPDATE ${sql(tableName)}
                    SET 
                        "order" = ${itemOrder},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${itemId}
                `;
            });
            await Promise.all(updatePromises);
            return NextResponse.json({ success: true, message: 'Order updated successfully' });
        }

        // Build update query - handle each field separately
        let result;

        if (type === 'goal') {
            if (isActive !== undefined) {
                result = await sql`
                    UPDATE "Goal"
                    SET 
                        "isActive" = ${isActive},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${id}
                    RETURNING *
                `;
            } else if (order !== undefined) {
                result = await sql`
                    UPDATE "Goal"
                    SET 
                        "order" = ${order},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${id}
                    RETURNING *
                `;
            } else if (name !== undefined || icon !== undefined || color !== undefined) {
                result = await sql`
                    UPDATE "Goal"
                    SET 
                        name = COALESCE(${name || null}, name),
                        icon = COALESCE(${icon || null}, icon),
                        color = COALESCE(${color || null}, color),
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${id}
                    RETURNING *
                `;
            } else {
                return NextResponse.json(
                    { error: 'No fields to update' },
                    { status: 400 }
                );
            }
        } else {
            if (isActive !== undefined) {
                result = await sql`
                    UPDATE "Habit"
                    SET 
                        "isActive" = ${isActive},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${id}
                    RETURNING *
                `;
            } else if (order !== undefined) {
                result = await sql`
                    UPDATE "Habit"
                    SET 
                        "order" = ${order},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${id}
                    RETURNING *
                `;
            } else if (name !== undefined || icon !== undefined || color !== undefined) {
                result = await sql`
                    UPDATE "Habit"
                    SET 
                        name = COALESCE(${name || null}, name),
                        icon = COALESCE(${icon || null}, icon),
                        color = COALESCE(${color || null}, color),
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "clientId" = ${clientId} AND id = ${id}
                    RETURNING *
                `;
            } else {
                return NextResponse.json(
                    { error: 'No fields to update' },
                    { status: 400 }
                );
            }
        }

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Goal/habit not found or you do not have permission' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            [type]: result[0]
        });

    } catch (error) {
        console.error('Error updating goal/habit:', error);
        return NextResponse.json(
            { error: 'Failed to update goal/habit' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a custom goal or habit
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = await getClientId(session);
        if (!clientId) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type');

        if (!id || !type) {
            return NextResponse.json(
                { error: 'ID and type are required' },
                { status: 400 }
            );
        }

        if (type !== 'goal' && type !== 'habit') {
            return NextResponse.json(
                { error: 'Type must be either "goal" or "habit"' },
                { status: 400 }
            );
        }

        const tableName = type === 'goal' ? 'Goal' : 'Habit';

        // Only allow deletion of custom goals/habits
        const result = await sql`
            DELETE FROM ${sql(tableName)}
            WHERE "clientId" = ${clientId} 
            AND id = ${id}
            AND "isCustom" = true
            RETURNING *
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Custom goal/habit not found or cannot be deleted' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `${type} deleted successfully`
        });

    } catch (error) {
        console.error('Error deleting goal/habit:', error);
        return NextResponse.json(
            { error: 'Failed to delete goal/habit' },
            { status: 500 }
        );
    }
}
