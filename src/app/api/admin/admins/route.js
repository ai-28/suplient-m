import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user?.id || session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all admin users
        const admins = await sql`
      SELECT 
        id,
        name,
        email,
        phone,
        "isActive",
        "isSuperAdmin",
        "createdAt",
        "updatedAt"
      FROM "User"
      WHERE role = 'admin'
      ORDER BY "isSuperAdmin" DESC, "createdAt" DESC
    `;

        return NextResponse.json({
            success: true,
            admins,
            count: admins.length
        });

    } catch (error) {
        console.error('Error fetching admin users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admin users' },
            { status: 500 }
        );
    }
}

