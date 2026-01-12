import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

/**
 * POST /api/client/update-last-active
 * Updates the lastActive timestamp for a client
 * Includes server-side throttling: only updates if lastActive is NULL or older than 1 hour
 */
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get client's timezone offset from request (optional)
        const body = await request.json().catch(() => ({}));
        const clientTimezoneOffset = body.timezoneOffset; // in minutes (e.g., -300 for EST)

        // Verify user is a client
        const userResult = await sql`
            SELECT id, role
            FROM "User"
            WHERE id = ${session.user.id}
        `;

        if (userResult.length === 0 || userResult[0].role !== 'client') {
            return NextResponse.json(
                { error: 'Only clients can update last active' },
                { status: 403 }
            );
        }

        // Get client record
        const clientResult = await sql`
            SELECT c.id, c."lastActive"
            FROM "Client" c
            WHERE c."userId" = ${session.user.id}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client record not found' },
                { status: 404 }
            );
        }

        const client = clientResult[0];
        const now = new Date();

        // Server-side throttling: only update if:
        // 1. lastActive is NULL (never updated), OR
        // 2. lastActive is older than 1 hour
        const shouldUpdate = !client.lastActive || 
            (new Date(client.lastActive).getTime() < (now.getTime() - 60 * 60 * 1000));

        if (!shouldUpdate) {
            return NextResponse.json({
                success: true,
                updated: false,
                message: 'Last active updated recently, skipping update',
                lastActive: client.lastActive
            });
        }

        // Update lastActive
        // Store as UTC timestamp explicitly (even if column is TIMESTAMP, we store UTC)
        // PostgreSQL CURRENT_TIMESTAMP uses server timezone, so we use UTC explicitly
        const updated = await sql`
            UPDATE "Client"
            SET "lastActive" = (NOW() AT TIME ZONE 'UTC'),
                "updatedAt" = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${client.id}
            RETURNING "lastActive"
        `;

        return NextResponse.json({
            success: true,
            updated: true,
            message: 'Last active updated successfully',
            lastActive: updated[0].lastActive
        });

    } catch (error) {
        console.error('Error updating last active:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

