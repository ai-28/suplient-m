import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        // Get only active coaches with minimal data needed for dropdown
        const coaches = await sql`
            SELECT 
                u.id, 
                u.name
            FROM "User" u
            WHERE u.role = 'coach' AND u."isActive" = true
            ORDER BY u.name ASC
        `;

        // Transform data for frontend dropdown (minimal data)
        const coachesData = coaches.map(coach => ({
            id: coach.id,
            name: coach.name
        }));

        return NextResponse.json({
            success: true,
            coaches: coachesData
        });

    } catch (error) {
        console.error('Error fetching assigned coaches:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
