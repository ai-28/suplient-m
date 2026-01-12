import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption.js';
import { activitySchema, activityHelpers } from '@/app/lib/db/activitySchema';

// GET /api/activities - Get activities for the current user or client
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const clientId = searchParams.get('clientId');
        const coachId = searchParams.get('coachId');
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;
        const isVisible = searchParams.get('isVisible') !== 'false';

        let result;

        if (coachId) {
            // Get activities for all clients of a specific coach
            result = await activitySchema.getCoachClientActivities(coachId, {
                limit,
                offset,
                type,
                isVisible
            });
        } else if (clientId) {
            // Get activities for a specific client
            result = await activitySchema.getClientActivities(clientId, {
                limit,
                offset,
                type,
                isVisible
            });
        } else if (userId) {
            // Get activities for a specific user
            result = await activitySchema.getUserActivities(userId, {
                limit,
                offset,
                type,
                isVisible
            });
        } else {
            // Get activities for the current user
            result = await activitySchema.getUserActivities(session.user.id, {
                limit,
                offset,
                type,
                isVisible
            });
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ activities: result.data });
    } catch (error) {
        console.error('Error fetching activities:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/activities - Create a new activity
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            userId = session.user.id,
            clientId,
            type,
            title,
            description,
            activityData,
            pointsEarned = 0,
            isVisible = true
        } = body;

        // Validate required fields
        if (!type || !title) {
            return NextResponse.json({ error: 'Type and title are required' }, { status: 400 });
        }

        // Validate activity type
        const validTypes = ['signup', 'task_completed', 'daily_checkin', 'session_attended', 'goal_achieved', 'milestone_reached', 'other'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
        }

        const result = await activitySchema.createActivity({
            userId,
            clientId,
            type,
            title,
            description,
            activityData,
            pointsEarned,
            isVisible
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ activity: result.data }, { status: 201 });
    } catch (error) {
        console.error('Error creating activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
