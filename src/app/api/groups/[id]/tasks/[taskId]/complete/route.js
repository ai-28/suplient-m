import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// PUT /api/groups/[id]/tasks/[taskId]/complete - Mark task as complete/incomplete for a member
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId, taskId } = await params;
        const body = await request.json();

        if (!groupId || !taskId) {
            return NextResponse.json({ error: 'Group ID and Task ID are required' }, { status: 400 });
        }

        const { clientId, completed } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        // Verify the task belongs to the coach and is a group task
        const taskResult = await sql`
            SELECT t.id, t."groupId", t."taskType"
            FROM "Task" t
            WHERE t.id = ${taskId} AND t."coachId" = ${session.user.id}
        `;

        if (taskResult.length === 0) {
            return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
        }

        if (taskResult[0].taskType !== 'group') {
            return NextResponse.json({ error: 'This endpoint is only for group tasks' }, { status: 400 });
        }

        // Verify the client is a member of the group
        const groupResult = await sql`
            SELECT g."selectedMembers"
            FROM "Group" g
            WHERE g.id = ${groupId}
        `;

        if (groupResult.length === 0 || !groupResult[0].selectedMembers.includes(clientId)) {
            return NextResponse.json({ error: 'Client is not a member of this group' }, { status: 400 });
        }

        let result;
        if (completed) {
            // Insert or update completion
            result = await sql`
                INSERT INTO "TaskCompletion" ("taskId", "clientId", "completedAt")
                VALUES (${taskId}, ${clientId}, NOW())
                ON CONFLICT ("taskId", "clientId") 
                DO UPDATE SET "completedAt" = NOW()
                RETURNING *
            `;
        } else {
            // Remove completion
            result = await sql`
                DELETE FROM "TaskCompletion"
                WHERE "taskId" = ${taskId} AND "clientId" = ${clientId}
                RETURNING *
            `;
        }

        return NextResponse.json({
            message: `Task ${completed ? 'completed' : 'marked incomplete'} successfully`,
            completion: result[0]
        });

    } catch (error) {
        console.error('Update task completion error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update task completion' },
            { status: 500 }
        );
    }
}
