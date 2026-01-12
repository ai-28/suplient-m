import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { taskRepo } from '@/app/lib/db/taskRepo';

// GET /api/groups/[id]/tasks - Get all tasks for a group with member completions
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Get group tasks with member completions
        const tasks = await taskRepo.getGroupTasksWithCompletions(id, session.user.id);

        return NextResponse.json({
            message: 'Group tasks fetched successfully',
            tasks: tasks
        });

    } catch (error) {
        console.error('Get group tasks error:', error);
        return NextResponse.json(
            { error: 'Failed to get group tasks' },
            { status: 500 }
        );
    }
}

// POST /api/groups/[id]/tasks - Create a new group task
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        const { title, description, dueDate } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Create group task using existing createTask function
        const task = await taskRepo.createTask({
            title,
            description,
            dueDate,
            taskType: 'group',
            groupId: id,
            coachId: session.user.id
        });

        return NextResponse.json({
            message: 'Group task created successfully',
            task: task
        });

    } catch (error) {
        console.error('Create group task error:', error);
        return NextResponse.json(
            { error: 'Failed to create group task' },
            { status: 500 }
        );
    }
}

