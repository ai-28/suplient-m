import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption.js';
import { activityHelpers } from '@/app/lib/db/activitySchema';
import { sql } from '@/app/lib/db/postgresql';

// POST /api/activities/daily-checkin - Create daily check-in activity
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId = session.user.id, clientId, checkinData } = body;

        // Validate required fields
        if (!checkinData || !checkinData.id) {
            return NextResponse.json({ error: 'Check-in data is required' }, { status: 400 });
        }

        // Get clientId from database if not provided
        let actualClientId = clientId;
        if (!actualClientId) {
            const clientResult = await sql`
                SELECT id FROM "Client" WHERE "userId" = ${session.user.id}
            `;

            if (clientResult.length === 0) {
                return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
            }

            actualClientId = clientResult[0].id;
        }

        const result = await activityHelpers.createDailyCheckinActivity(userId, actualClientId, checkinData, {
            nameProvided: !!session.user.name,
            userName: session.user.name || null
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ activity: result.data }, { status: 201 });
    } catch (error) {
        console.error('Error creating daily check-in activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
