import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// POST /api/clients/bycoach - Get clients by coach
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { coachId } = body;

        // Validate coachId matches session user
        if (coachId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch clients assigned to this coach
        const clients = await sql`
            SELECT c.id, u.id as "userId", u.name, u.email, u.phone, u.role, u."isActive",
                   c."referralSource", c."primaryConcerns"
            FROM "User" u
            LEFT JOIN "Client" c ON u.id = c."userId"
            WHERE u.role = 'client' 
            AND u."coachId" = ${coachId}
            AND u."isActive" = true
            ORDER BY u.name ASC
        `;

        return NextResponse.json({
            message: 'Clients fetched successfully',
            clients: clients
        });
    } catch (error) {
        console.error('Get clients by coach error:', error);
        return NextResponse.json(
            { error: 'Failed to get clients' },
            { status: 500 }
        );
    }
}
