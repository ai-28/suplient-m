import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption.js';
import { activitySchema } from '@/app/lib/db/activitySchema';

// GET /api/activities/stats - Get activity statistics
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const clientId = searchParams.get('clientId');

        const result = await activitySchema.getActivityStats(
            userId || session.user.id,
            clientId
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ stats: result.data });
    } catch (error) {
        console.error('Error fetching activity stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
