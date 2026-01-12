import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET - Fetch all templates for the coach
export async function GET(request) {
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

        // Fetch all templates for this coach
        const templates = await sql`
            SELECT 
                id,
                name,
                description,
                "isDefault",
                "createdAt",
                "updatedAt"
            FROM "GoalHabitTemplate"
            WHERE "coachId" = ${coachId}
            ORDER BY "createdAt" DESC
        `;

        // For each template, fetch its items
        const templatesWithItems = await Promise.all(
            templates.map(async (template) => {
                const items = await sql`
                    SELECT 
                        id,
                        type,
                        name,
                        icon,
                        color,
                        "order"
                    FROM "GoalHabitTemplateItem"
                    WHERE "templateId" = ${template.id}
                    ORDER BY "order" ASC, "createdAt" ASC
                `;

                return {
                    ...template,
                    items: items.map(item => ({
                        id: item.id,
                        type: item.type,
                        name: item.name,
                        icon: item.icon,
                        color: item.color,
                        order: item.order
                    }))
                };
            })
        );

        return NextResponse.json({
            success: true,
            templates: templatesWithItems
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Create a new template
export async function POST(request) {
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
        const body = await request.json();
        const { name, description, items } = body;

        if (!name || !items || !Array.isArray(items)) {
            return NextResponse.json(
                { error: 'Name and items array are required' },
                { status: 400 }
            );
        }

        // Create the template
        const [template] = await sql`
            INSERT INTO "GoalHabitTemplate" ("coachId", name, description, "isDefault")
            VALUES (${coachId}, ${name}, ${description || null}, false)
            RETURNING id, name, description, "isDefault", "createdAt", "updatedAt"
        `;

        // Insert template items
        if (items.length > 0) {
            const itemsToInsert = items.map((item, index) => ({
                templateId: template.id,
                type: item.type,
                name: item.name,
                icon: item.icon || null,
                color: item.color || null,
                order: item.order !== undefined ? item.order : index + 1
            }));

            for (const item of itemsToInsert) {
                await sql`
                    INSERT INTO "GoalHabitTemplateItem" ("templateId", type, name, icon, color, "order")
                    VALUES (${item.templateId}, ${item.type}, ${item.name}, ${item.icon}, ${item.color}, ${item.order})
                `;
            }
        }

        // Fetch the created template with items
        const templateItems = await sql`
            SELECT 
                id,
                type,
                name,
                icon,
                color,
                "order"
            FROM "GoalHabitTemplateItem"
            WHERE "templateId" = ${template.id}
            ORDER BY "order" ASC
        `;

        return NextResponse.json({
            success: true,
            template: {
                ...template,
                items: templateItems.map(item => ({
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    icon: item.icon,
                    color: item.color,
                    order: item.order
                }))
            }
        });
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update a template
export async function PUT(request) {
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
        const body = await request.json();
        const { id, name, description, items } = body;

        if (!id || !name) {
            return NextResponse.json(
                { error: 'Template ID and name are required' },
                { status: 400 }
            );
        }

        // Verify template belongs to this coach
        const existingTemplate = await sql`
            SELECT id FROM "GoalHabitTemplate"
            WHERE id = ${id} AND "coachId" = ${coachId}
        `;

        if (existingTemplate.length === 0) {
            return NextResponse.json(
                { error: 'Template not found or access denied' },
                { status: 404 }
            );
        }

        // Update the template
        await sql`
            UPDATE "GoalHabitTemplate"
            SET 
                name = ${name},
                description = ${description || null},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${id}
        `;

        // If items are provided, replace all items
        if (items && Array.isArray(items)) {
            // Delete existing items
            await sql`
                DELETE FROM "GoalHabitTemplateItem"
                WHERE "templateId" = ${id}
            `;

            // Insert new items
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await sql`
                    INSERT INTO "GoalHabitTemplateItem" ("templateId", type, name, icon, color, "order")
                    VALUES (${id}, ${item.type}, ${item.name}, ${item.icon || null}, ${item.color || null}, ${item.order !== undefined ? item.order : i + 1})
                `;
            }
        }

        // Fetch updated template with items
        const [updatedTemplate] = await sql`
            SELECT id, name, description, "isDefault", "createdAt", "updatedAt"
            FROM "GoalHabitTemplate"
            WHERE id = ${id}
        `;

        const templateItems = await sql`
            SELECT 
                id,
                type,
                name,
                icon,
                color,
                "order"
            FROM "GoalHabitTemplateItem"
            WHERE "templateId" = ${id}
            ORDER BY "order" ASC
        `;

        return NextResponse.json({
            success: true,
            template: {
                ...updatedTemplate,
                items: templateItems.map(item => ({
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    icon: item.icon,
                    color: item.color,
                    order: item.order
                }))
            }
        });
    } catch (error) {
        console.error('Error updating template:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete a template
export async function DELETE(request) {
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
        const { searchParams } = new URL(request.url);
        const templateId = searchParams.get('id');

        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Verify template belongs to this coach
        const existingTemplate = await sql`
            SELECT id FROM "GoalHabitTemplate"
            WHERE id = ${templateId} AND "coachId" = ${coachId}
        `;

        if (existingTemplate.length === 0) {
            return NextResponse.json(
                { error: 'Template not found or access denied' },
                { status: 404 }
            );
        }

        // Delete template (items will be cascade deleted)
        await sql`
            DELETE FROM "GoalHabitTemplate"
            WHERE id = ${templateId}
        `;

        return NextResponse.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

