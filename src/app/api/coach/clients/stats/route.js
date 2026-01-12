import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/coach/clients/stats - Get coach's client statistics
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;

        // Get total active clients
        const activeClientsResult = await sql`
            SELECT COUNT(*) as count
            FROM "Client" c
            WHERE c."coachId" = ${coachId}
            AND c.status = 'active'
        `;

        // Get new clients this month
        const currentMonth = new Date();
        currentMonth.setDate(1); // First day of current month
        const currentMonthStart = currentMonth.toISOString().split('T')[0];

        const newClientsResult = await sql`
            SELECT COUNT(*) as count
            FROM "Client" c
            WHERE c."coachId" = ${coachId}
            AND DATE(c."createdAt") >= ${currentMonthStart}
        `;

        // Get churned clients this month (clients who became inactive)
        const churnedClientsResult = await sql`
            SELECT COUNT(*) as count
            FROM "Client" c
            WHERE c."coachId" = ${coachId}
            AND c.status = 'inactive'
            AND DATE(c."updatedAt") >= ${currentMonthStart}
        `;

        // Get total clients (all statuses)
        const totalClientsResult = await sql`
            SELECT COUNT(*) as count
            FROM "Client" c
            WHERE c."coachId" = ${coachId}
        `;

        return NextResponse.json({
            activeClients: parseInt(activeClientsResult[0].count),
            newClientsThisMonth: parseInt(newClientsResult[0].count),
            churnedClientsThisMonth: parseInt(churnedClientsResult[0].count),
            totalClients: parseInt(totalClientsResult[0].count),
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get coach client stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
