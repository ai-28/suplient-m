import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Extract userId from params (Next.js 13+ app router)
        const { userId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Verify the user is requesting their own client data or is a coach
        if (session.user.id !== userId) {
            // Check if the user is a coach for this client
            // The userId is the User.id, we need to find the Client record where Client.userId = userId
            const coachCheck = await sql`
                SELECT c.id FROM "Client" c
                WHERE c."userId" = ${userId} AND c."coachId" = ${session.user.id}
                LIMIT 1
            `;

            if (coachCheck.length === 0) {
                // Also check if user is admin
                if (session.user.role !== 'admin') {
                    return NextResponse.json(
                        { error: 'Access denied' },
                        { status: 403 }
                    );
                }
            }
        }

        // Get client data by userId
        const clientResult = await sql`
            SELECT 
                c.id,
                c.name,
                c.email,
                c."userId",
                c."coachId",
                c."createdAt",
                c."updatedAt"
            FROM "Client" c
            WHERE c."userId" = ${userId}
            LIMIT 1
        `;

        if (clientResult.length === 0) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            );
        }

        const client = clientResult[0];

        return NextResponse.json({
            success: true,
            client: client
        });

    } catch (error) {
        console.error('Get client by user ID error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
