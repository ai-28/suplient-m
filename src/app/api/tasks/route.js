import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { taskRepo } from '@/app/lib/db/taskRepo';
import { sql } from '@/app/lib/db/postgresql';
import { userStatsRepo } from '@/app/lib/db/userStatsRepo';


// GET /api/tasks - Get tasks for a client
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        let clientId = searchParams.get('clientId');

        // If no clientId provided, try to get it from the session
        if (!clientId) {
            const clientResult = await sql`
                SELECT c.id
                FROM "Client" c
                WHERE c."userId" = ${session.user.id}
                LIMIT 1
            `;

            if (clientResult.length > 0) {
                clientId = clientResult[0].id;
            } else {
                return NextResponse.json(
                    { error: 'Client ID is required and could not be determined from session' },
                    { status: 400 }
                );
            }
        }

        // Verify the client belongs to the authenticated user (if user is a client)
        // or verify the client belongs to the coach (if user is a coach)
        const clientResult = await sql`
            SELECT c.id, c."userId", c."coachId"
            FROM "Client" c
            WHERE c.id = ${clientId}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            );
        }

        const client = clientResult[0];

        // Check if the authenticated user is the client or their coach
        const isClient = client.userId === session.user.id;
        const isCoach = client.coachId === session.user.id;

        if (!isClient && !isCoach) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Fetch tasks for the client
        const tasksResult = await sql`
            SELECT 
                t.id,
                t.title,
                t.description,
                t."dueDate",
                t.status,
                t."taskType",
                t."isRepetitive",
                t."repetitiveFrequency",
                t."repetitiveCount",
                t."createdAt",
                t."updatedAt",
                tc."completedAt",
                CASE 
                    WHEN tc."completedAt" IS NOT NULL THEN true
                    ELSE false
                END as "isCompleted"
            FROM "Task" t
            LEFT JOIN "TaskCompletion" tc ON t.id = tc."taskId" AND tc."clientId" = ${clientId}
            WHERE (
                t."clientId" = ${clientId} 
                OR (t."groupId" IS NOT NULL AND ${clientId} = ANY(
                    SELECT unnest(g."selectedMembers")
                    FROM "Group" g
                    WHERE g.id = t."groupId"
                ))
            )
            AND t.status != 'deleted'
            ORDER BY 
                CASE WHEN tc."completedAt" IS NULL THEN 0 ELSE 1 END,
                t."dueDate" ASC NULLS LAST,
                t."createdAt" DESC
        `;

        // Transform the data to match the expected format
        const tasks = tasksResult.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: getPriorityFromTask(task),
            isCompleted: task.isCompleted,
            category: getCategoryFromTask(task),
            estimatedTime: getEstimatedTimeFromTask(task),
            status: task.status,
            taskType: task.taskType,
            isRepetitive: task.isRepetitive,
            repetitiveFrequency: task.repetitiveFrequency,
            repetitiveCount: task.repetitiveCount,
            completedAt: task.completedAt,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));

        return NextResponse.json({ tasks });

    } catch (error) {
        console.error('Get tasks error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
}

// Helper functions to transform task data
function getPriorityFromTask(task) {
    // You can implement logic to determine priority based on due date, task type, etc.
    const now = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;

    if (dueDate && dueDate < now && !task.isCompleted) {
        return 'high'; // Overdue tasks are high priority
    }

    if (dueDate) {
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 1) return 'high';
        if (daysUntilDue <= 3) return 'medium';
    }

    return 'low';
}

function getCategoryFromTask(task) {
    // Map task types to categories
    switch (task.taskType) {
        case 'personal':
            return 'personal';
        case 'client':
            return 'assigned';
        case 'group':
            return 'group';
        default:
            return 'general';
    }
}

function getEstimatedTimeFromTask(task) {
    // You can implement logic to estimate time based on task description or type
    // For now, return a default value
    return 30; // Default 30 minutes
}

// PUT /api/tasks - Update task completion status
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { taskId, isCompleted } = body;

        if (!taskId || typeof isCompleted !== 'boolean') {
            return NextResponse.json(
                { error: 'Task ID and completion status are required' },
                { status: 400 }
            );
        }

        // Get the client ID from session
        const clientResult = await sql`
            SELECT c.id
            FROM "Client" c
            WHERE c."userId" = ${session.user.id}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            );
        }

        const clientId = clientResult[0].id;

        // Verify the task belongs to this client
        const taskResult = await sql`
            SELECT t.id, t."clientId", t."groupId"
            FROM "Task" t
            WHERE t.id = ${taskId}
            AND (
                t."clientId" = ${clientId} 
                OR (t."groupId" IS NOT NULL AND ${clientId} = ANY(
                    SELECT unnest(g."selectedMembers")
                    FROM "Group" g
                    WHERE g.id = t."groupId"
                ))
            )
            LIMIT 1
        `;

        if (taskResult.length === 0) {
            return NextResponse.json(
                { error: 'Task not found or access denied' },
                { status: 404 }
            );
        }

        if (isCompleted) {
            // Mark task as completed
            const completionResult = await sql`
                INSERT INTO "TaskCompletion" ("taskId", "clientId", "completedAt")
                VALUES (${taskId}, ${clientId}, CURRENT_TIMESTAMP)
                ON CONFLICT ("taskId", "clientId") 
                DO UPDATE SET "completedAt" = CURRENT_TIMESTAMP
                RETURNING "completedAt"
            `;

            // Record engagement activity for task completion
            try {
                const today = new Date().toISOString().split('T')[0];
                await userStatsRepo.addEngagementActivity(session.user.id, 'task', 1, today);
            } catch (engagementError) {
                console.error('Error recording task completion engagement:', engagementError);
                // Don't fail the task completion if engagement tracking fails
            }

            // Create notification for coach when task is completed
            try {
                const { NotificationService } = require('@/app/lib/services/NotificationService');

                // Get client name from session (already available)
                const clientName = session.user.name || 'Client';

                // Get task details and coach information
                // Handle both individual tasks (clientId) and group tasks (groupId)
                const taskDetailsResult = await sql`
                    SELECT 
                        t.title, 
                        COALESCE(c."coachId", g."coachId") as "coachId"
                    FROM "Task" t
                    LEFT JOIN "Client" c ON c.id = t."clientId"
                    LEFT JOIN "Group" g ON g.id = t."groupId"
                    WHERE t.id = ${taskId}
                `;

                if (taskDetailsResult.length > 0) {
                    const { title: taskTitle, coachId } = taskDetailsResult[0];

                    if (coachId) {
                        await NotificationService.notifyTaskCompletion(clientId, coachId, clientName, taskTitle);
                        console.log(`✅ Task completion notification sent: ${clientName} completed "${taskTitle}"`);
                    } else {
                        console.warn('⚠️ No coachId found for task, skipping notification');
                    }
                } else {
                    console.warn('⚠️ Task not found for notification, skipping');
                }
            } catch (notificationError) {
                console.error('❌ Error creating task completion notification:', notificationError);
                // Don't fail the task completion if notification creation fails
            }

            return NextResponse.json({
                message: 'Task marked as completed',
                completedAt: completionResult[0].completedAt
            });
        } else {
            // Mark task as not completed (remove completion record)
            await sql`
                DELETE FROM "TaskCompletion" 
                WHERE "taskId" = ${taskId} AND "clientId" = ${clientId}
            `;

            return NextResponse.json({
                message: 'Task marked as not completed'
            });
        }

    } catch (error) {
        console.error('Update task completion error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/tasks - Create a new task
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const {
            title,
            description,
            dueDate,
            taskType,
            selectedClients,
            selectedGroup,
            isRepetitive,
            repetitiveFrequency,
            repetitiveCount
        } = body;

        // Validate required fields
        if (!title || !taskType) {
            return NextResponse.json(
                { error: 'Title and task type are required' },
                { status: 400 }
            );
        }

        const coachId = session.user.id;
        let createdTasks = [];

        // Handle repetitive task logic properly
        const isRepetitiveTask = isRepetitive === true;
        const finalRepetitiveFrequency = isRepetitiveTask ? (repetitiveFrequency || null) : null;
        const finalRepetitiveCount = isRepetitiveTask ? (repetitiveCount || null) : null;

        if (taskType === 'personal') {
            // Create personal task for the coach
            const taskData = {
                title,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                taskType: 'personal',
                coachId,
                clientId: null,
                groupId: null,
                isRepetitive: isRepetitiveTask,
                repetitiveFrequency: finalRepetitiveFrequency,
                repetitiveCount: finalRepetitiveCount
            };

            const task = await taskRepo.createTask(taskData);
            createdTasks.push(task);
        } else if (taskType === 'client' && selectedClients?.length > 0) {
            // Create tasks for selected clients
            for (const clientId of selectedClients) {
                const taskData = {
                    title,
                    description: description || null,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    taskType: 'client',
                    coachId,
                    clientId,
                    groupId: null,
                    isRepetitive: isRepetitiveTask,
                    repetitiveFrequency: finalRepetitiveFrequency,
                    repetitiveCount: finalRepetitiveCount
                };

                const task = await taskRepo.createTask(taskData);
                createdTasks.push(task);

                // Send notification to client about new task
                try {
                    const { NotificationService } = require('@/app/lib/services/NotificationService');

                    // Get client details for notification
                    const clientDetails = await sql`
                        SELECT c.id, c.name, c."userId"
                        FROM "Client" c
                        WHERE c.id = ${clientId}
                    `;

                    if (clientDetails.length > 0) {
                        const client = clientDetails[0];
                        await NotificationService.notifyTaskCreated(
                            client.userId, // Use userId instead of client.id
                            session.user.id,
                            session.user.name,
                            title
                        );
                        console.log('✅ Task creation notification sent to client:', client.name);
                    }
                } catch (notificationError) {
                    console.error('❌ Error creating task notification:', notificationError);
                    // Don't fail task creation if notification fails
                }
            }
        } else if (taskType === 'group' && selectedGroup?.id) {
            // Create group task
            const taskData = {
                title,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                taskType: 'group',
                coachId,
                clientId: null,
                groupId: selectedGroup.id,
                isRepetitive: isRepetitiveTask,
                repetitiveFrequency: finalRepetitiveFrequency,
                repetitiveCount: finalRepetitiveCount
            };

            const task = await taskRepo.createTask(taskData);
            createdTasks.push(task);
        } else {
            return NextResponse.json(
                { error: 'Invalid task type or missing required data' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            message: 'Tasks created successfully',
            tasks: createdTasks
        });
    } catch (error) {
        console.error('Create task error:', error);
        return NextResponse.json(
            { error: 'Failed to create task' },
            { status: 500 }
        );
    }
}
