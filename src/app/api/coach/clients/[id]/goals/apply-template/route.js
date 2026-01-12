import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// Helper function to verify coach access to client
async function verifyCoachAccess(coachId, clientId) {
    const result = await sql`
        SELECT id FROM "Client"
        WHERE id = ${clientId} AND "coachId" = ${coachId}
    `;
    return result.length > 0;
}

// POST - Apply a template to a client
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
        const body = await request.json();
        const { templateId, mode } = body; // mode: 'replace' or 'merge'

        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        if (mode !== 'replace' && mode !== 'merge') {
            return NextResponse.json(
                { error: 'Mode must be either "replace" or "merge"' },
                { status: 400 }
            );
        }

        // Verify coach has access to this client
        const hasAccess = await verifyCoachAccess(coachId, clientId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Client not found or you do not have access' },
                { status: 404 }
            );
        }

        // Verify template belongs to this coach
        const template = await sql`
            SELECT id, name FROM "GoalHabitTemplate"
            WHERE id = ${templateId} AND "coachId" = ${coachId}
        `;

        if (template.length === 0) {
            return NextResponse.json(
                { error: 'Template not found or access denied' },
                { status: 404 }
            );
        }

        // Fetch template items
        const templateItems = await sql`
            SELECT 
                type,
                name,
                icon,
                color,
                "order"
            FROM "GoalHabitTemplateItem"
            WHERE "templateId" = ${templateId}
            ORDER BY "order" ASC
        `;

        if (templateItems.length === 0) {
            return NextResponse.json(
                { error: 'Template has no items' },
                { status: 400 }
            );
        }

        let addedGoals = 0;
        let addedHabits = 0;
        let skippedGoals = 0;
        let skippedHabits = 0;

        // If replace mode, delete all existing goals and habits
        if (mode === 'replace') {
            await sql`DELETE FROM "Goal" WHERE "clientId" = ${clientId}`;
            await sql`DELETE FROM "Habit" WHERE "clientId" = ${clientId}`;
        } else {
            // Merge mode: get existing goals and habits to check for duplicates
            const existingGoals = await sql`
                SELECT LOWER(name) as name_lower FROM "Goal" WHERE "clientId" = ${clientId}
            `;
            const existingHabits = await sql`
                SELECT LOWER(name) as name_lower FROM "Habit" WHERE "clientId" = ${clientId}
            `;

            const existingGoalNames = new Set(existingGoals.map(g => g.name_lower));
            const existingHabitNames = new Set(existingHabits.map(h => h.name_lower));

            // Filter out duplicates
            const goalsToAdd = templateItems.filter(item =>
                item.type === 'goal' && !existingGoalNames.has(item.name.toLowerCase())
            );
            const habitsToAdd = templateItems.filter(item =>
                item.type === 'habit' && !existingHabitNames.has(item.name.toLowerCase())
            );

            skippedGoals = templateItems.filter(item =>
                item.type === 'goal' && existingGoalNames.has(item.name.toLowerCase())
            ).length;
            skippedHabits = templateItems.filter(item =>
                item.type === 'habit' && existingHabitNames.has(item.name.toLowerCase())
            ).length;

            // Get max order for goals and habits
            const maxGoalOrder = await sql`
                SELECT COALESCE(MAX("order"), 0) as max_order
                FROM "Goal"
                WHERE "clientId" = ${clientId}
            `;
            const maxHabitOrder = await sql`
                SELECT COALESCE(MAX("order"), 0) as max_order
                FROM "Habit"
                WHERE "clientId" = ${clientId}
            `;

            let goalOrder = (maxGoalOrder[0]?.max_order || 0) + 1;
            let habitOrder = (maxHabitOrder[0]?.max_order || 0) + 1;

            // Add goals
            for (const goal of goalsToAdd) {
                await sql`
                    INSERT INTO "Goal" ("clientId", name, icon, color, "isActive", "isCustom", "isDefault", "order")
                    VALUES (${clientId}, ${goal.name}, ${goal.icon || null}, ${goal.color || null}, true, false, false, ${goalOrder++})
                `;
                addedGoals++;
            }

            // Add habits
            for (const habit of habitsToAdd) {
                await sql`
                    INSERT INTO "Habit" ("clientId", name, icon, color, "isActive", "isCustom", "isDefault", "order")
                    VALUES (${clientId}, ${habit.name}, ${habit.icon || null}, ${habit.color || null}, true, false, false, ${habitOrder++})
                `;
                addedHabits++;
            }

            return NextResponse.json({
                success: true,
                message: `Template applied successfully (merge mode)`,
                added: { goals: addedGoals, habits: addedHabits },
                skipped: { goals: skippedGoals, habits: skippedHabits },
                mode: 'merge'
            });
        }

        // Replace mode: add all template items
        let goalOrder = 1;
        let habitOrder = 1;

        for (const item of templateItems) {
            if (item.type === 'goal') {
                await sql`
                    INSERT INTO "Goal" ("clientId", name, icon, color, "isActive", "isCustom", "isDefault", "order")
                    VALUES (${clientId}, ${item.name}, ${item.icon || null}, ${item.color || null}, true, false, false, ${goalOrder++})
                `;
                addedGoals++;
            } else if (item.type === 'habit') {
                await sql`
                    INSERT INTO "Habit" ("clientId", name, icon, color, "isActive", "isCustom", "isDefault", "order")
                    VALUES (${clientId}, ${item.name}, ${item.icon || null}, ${item.color || null}, true, false, false, ${habitOrder++})
                `;
                addedHabits++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Template applied successfully (replace mode)`,
            added: { goals: addedGoals, habits: addedHabits },
            skipped: { goals: 0, habits: 0 },
            mode: 'replace'
        });
    } catch (error) {
        console.error('Error applying template:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

