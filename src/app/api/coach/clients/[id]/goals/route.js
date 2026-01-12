import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// Helper function to verify coach has access to client
async function verifyCoachAccess(coachId, clientId) {
    const result = await sql`
        SELECT c.id 
        FROM "Client" c
        WHERE c.id = ${clientId} AND c."coachId" = ${coachId}
    `;
    return result.length > 0;
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

// GET - Fetch client's goals and habits
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a coach
        const user = await sql`
            SELECT id, role FROM "User" WHERE id = ${session.user.id}
        `;

        if (user.length === 0 || user[0].role !== 'coach') {
            return NextResponse.json(
                { error: 'Only coaches can access this endpoint' },
                { status: 403 }
            );
        }

        const coachId = user[0].id;
        const { id: clientId } = await params;

        // Verify coach has access to this client
        const hasAccess = await verifyCoachAccess(coachId, clientId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Client not found or you do not have access' },
                { status: 404 }
            );
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
        let goalScores = latestCheckIn?.goalScores || {};
        let habitScores = latestCheckIn?.habitScores || {};
        
        // Parse JSONB if it's a string
        if (typeof goalScores === 'string') {
            try {
                goalScores = JSON.parse(goalScores);
            } catch (e) {
                console.error('Error parsing goalScores:', e);
                goalScores = {};
            }
        }
        
        if (typeof habitScores === 'string') {
            try {
                habitScores = JSON.parse(habitScores);
            } catch (e) {
                console.error('Error parsing habitScores:', e);
                habitScores = {};
            }
        }

        // Map goals with scores - handle UUID/string ID matching
        const goals = goalsData.map(goal => {
            // Try multiple ID formats for matching (UUID object, string, lowercase)
            const goalIdStr = String(goal.id);
            const goalIdLower = goalIdStr.toLowerCase();
            
            let currentScore = goalScores[goal.id];
            if (currentScore === undefined) currentScore = goalScores[goalIdStr];
            if (currentScore === undefined) currentScore = goalScores[goalIdLower];
            // Also check if keys are stored differently
            const goalKeys = Object.keys(goalScores);
            const matchingKey = goalKeys.find(key => 
                String(key).toLowerCase() === goalIdLower
            );
            if (currentScore === undefined && matchingKey) {
                currentScore = goalScores[matchingKey];
            }
            
            // Default to 3 if not found
            if (currentScore === undefined) currentScore = 3;
            
            const averageScore = 3; // Could calculate from check-ins if needed

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

        // Map habits with scores - handle UUID/string ID matching
        const habits = habitsData.map(habit => {
            // Try multiple ID formats for matching (UUID object, string, lowercase)
            const habitIdStr = String(habit.id);
            const habitIdLower = habitIdStr.toLowerCase();
            
            let currentScore = habitScores[habit.id];
            if (currentScore === undefined) currentScore = habitScores[habitIdStr];
            if (currentScore === undefined) currentScore = habitScores[habitIdLower];
            // Also check if keys are stored differently
            const habitKeys = Object.keys(habitScores);
            const matchingKey = habitKeys.find(key => 
                String(key).toLowerCase() === habitIdLower
            );
            if (currentScore === undefined && matchingKey) {
                currentScore = habitScores[matchingKey];
            }
            
            // Default to 2 if not found
            if (currentScore === undefined) currentScore = 2;
            
            const averageScore = 2; // Could calculate from check-ins if needed

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

        return NextResponse.json({
            success: true,
            goals,
            badHabits: habits
        });

    } catch (error) {
        console.error('Error fetching client goals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch goals data' },
            { status: 500 }
        );
    }
}

// POST - Create a new goal or habit for the client
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a coach
        const user = await sql`
            SELECT id, role FROM "User" WHERE id = ${session.user.id}
        `;

        if (user.length === 0 || user[0].role !== 'coach') {
            return NextResponse.json(
                { error: 'Only coaches can access this endpoint' },
                { status: 403 }
            );
        }

        const coachId = user[0].id;
        const { id: clientId } = await params;

        // Verify coach has access to this client
        const hasAccess = await verifyCoachAccess(coachId, clientId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Client not found or you do not have access' },
                { status: 404 }
            );
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
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a coach
        const user = await sql`
            SELECT id, role FROM "User" WHERE id = ${session.user.id}
        `;

        if (user.length === 0 || user[0].role !== 'coach') {
            return NextResponse.json(
                { error: 'Only coaches can access this endpoint' },
                { status: 403 }
            );
        }

        const coachId = user[0].id;
        const { id: clientId } = await params;

        // Verify coach has access to this client
        const hasAccess = await verifyCoachAccess(coachId, clientId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Client not found or you do not have access' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { id, type, isActive, name, icon, color, order, orders } = body;

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

        // Build update query
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
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a coach
        const user = await sql`
            SELECT id, role FROM "User" WHERE id = ${session.user.id}
        `;

        if (user.length === 0 || user[0].role !== 'coach') {
            return NextResponse.json(
                { error: 'Only coaches can access this endpoint' },
                { status: 403 }
            );
        }

        const coachId = user[0].id;
        const { id: clientId } = await params;

        // Verify coach has access to this client
        const hasAccess = await verifyCoachAccess(coachId, clientId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Client not found or you do not have access' },
                { status: 404 }
            );
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

