import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/coach/tasks/today - Get today's tasks for the coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get today's tasks for the coach
        // PostgreSQL stores dates in UTC, so we need to be consistent
        // Use a simple approach: get today's date and use it consistently
        const today = new Date().toISOString().split('T')[0];

        const tasksResult = await sql`
            SELECT 
                t.id,
                t.title,
                t.description,
                t."dueDate",
                t.status,
                t."taskType",
                t."createdAt",
                t."updatedAt",
                c.name as "clientName",
                g.name as "groupName"
            FROM "Task" t
            LEFT JOIN "Client" c ON t."clientId" = c.id
            LEFT JOIN "Group" g ON t."groupId" = g.id
            WHERE t."coachId" = ${session.user.id}
            AND DATE(t."dueDate") = ${today}
            ORDER BY t."createdAt" ASC
        `;

        // Transform the data to match expected format
        const tasks = tasksResult.map(task => ({
            id: task.id,
            text: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            taskType: task.taskType,
            clientName: task.clientName,
            groupName: task.groupName,
            completed: task.status === 'completed',
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));

        return NextResponse.json({
            tasks,
            totalCount: tasks.length,
            completedCount: tasks.filter(t => t.completed).length
        });

    } catch (error) {
        console.error('Get today\'s tasks error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/coach/tasks/today - Update task completion status
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { taskId, completed } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        if (typeof completed !== 'boolean') {
            return NextResponse.json({ error: 'Completed status is required' }, { status: 400 });
        }

        // Verify the task belongs to the current coach and get task details including assignedBy
        const taskResult = await sql`
            SELECT t.id, t.title, t.status, t."coachId", t."assignedBy"
            FROM "Task" t
            WHERE t.id = ${taskId} AND t."coachId" = ${session.user.id}
        `;

        if (taskResult.length === 0) {
            return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
        }

        const task = taskResult[0];

        // Update the task status
        const newStatus = completed ? 'completed' : 'pending';
        const updatedTask = await sql`
            UPDATE "Task"
            SET 
                status = ${newStatus},
                "updatedAt" = NOW()
            WHERE id = ${taskId}
            RETURNING *
        `;

        // If task was completed and was assigned by an admin, notify the admin
        if (completed && task.assignedBy) {
            try {
                // Check if the assigner is an admin
                const assignerCheck = await sql`
                    SELECT id, name, role
                    FROM "User"
                    WHERE id = ${task.assignedBy} AND role = 'admin'
                    LIMIT 1
                `;

                if (assignerCheck.length > 0) {
                    const { NotificationService } = require('@/app/lib/services/NotificationService');
                    const admin = assignerCheck[0];
                    const coachName = session.user.name || 'Coach';

                    await NotificationService.notifyCoachTaskCompleted(
                        admin.id,
                        session.user.id,
                        coachName,
                        task.title,
                        taskId
                    );
                    console.log(`✅ Coach task completion notification sent to admin: ${admin.name}`);
                }
            } catch (notificationError) {
                console.error('❌ Error creating coach task completion notification:', notificationError);
                // Don't fail task completion if notification fails
            }
        }

        return NextResponse.json({
            message: completed ? 'Task marked as completed' : 'Task marked as pending',
            task: {
                id: updatedTask[0].id,
                title: updatedTask[0].title,
                status: updatedTask[0].status,
                completed: completed
            }
        });

    } catch (error) {
        console.error('Update task completion error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
