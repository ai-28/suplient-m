import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Verify user is a client
        const user = await sql`
            SELECT id, role FROM "User" WHERE id = ${userId}
        `;

        if (user.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user[0].role !== 'client') {
            return NextResponse.json(
                { error: 'Only clients can deactivate their profile' },
                { status: 403 }
            );
        }

        // Deactivate the user profile
        const updatedUser = await sql`
            UPDATE "User" 
            SET 
                "isActive" = false,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${userId}
            RETURNING id, name, email, "isActive", "updatedAt"
        `;

        if (updatedUser.length === 0) {
            return NextResponse.json(
                { error: 'Failed to deactivate profile' },
                { status: 500 }
            );
        }

        // Also update the Client table status
        await sql`
            UPDATE "Client" 
            SET 
                status = 'inactive',
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "userId" = ${userId}
        `;

        return NextResponse.json({
            success: true,
            message: 'Profile deactivated successfully',
            user: updatedUser[0]
        });

    } catch (error) {
        console.error('Error deactivating profile:', error);
        return NextResponse.json(
            { error: 'Failed to deactivate profile' },
            { status: 500 }
        );
    }
}

