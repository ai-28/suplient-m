import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { taskRepo } from '@/app/lib/db/taskRepo';


export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { coachId } = body;

        const tasks = await taskRepo.getTasksByCoach(coachId);

        return NextResponse.json({
            message: 'Tasks fetched successfully',
            tasks: tasks
        });
    } catch (error) {
        console.error('Get tasks by coach error:', error);
        return NextResponse.json(
            { error: 'Failed to get tasks by coach' },
            { status: 500 }
        );
    }
}
