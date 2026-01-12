import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption.js';
import { activityHelpers } from '@/app/lib/db/activitySchema';

// POST /api/activities/task-completed - Create task completion activity
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId = session.user.id, clientId, taskData } = body;

        // Validate required fields
        if (!taskData || !taskData.id) {
            return NextResponse.json({ error: 'Task data is required' }, { status: 400 });
        }

        const result = await activityHelpers.createTaskCompletionActivity(userId, clientId, taskData);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ activity: result.data }, { status: 201 });
    } catch (error) {
        console.error('Error creating task completion activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
