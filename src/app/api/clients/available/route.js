import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/clients/available - Get available clients for adding to groups
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('groupId');

        // Get all clients belonging to this coach
        let clientsQuery;
        if (groupId) {
            // Exclude clients already in this group
            clientsQuery = sql`
                SELECT 
                    c.id,
                    c.name,
                    c.email,
                    c.status,
                    c."createdAt"
                FROM "Client" c
                WHERE c."coachId" = ${session.user.id}
                AND c.id NOT IN (
                    SELECT unnest(g."selectedMembers")
                    FROM "Group" g
                    WHERE g.id = ${groupId}
                )
                ORDER BY c.name ASC
            `;
        } else {
            // Get all clients for this coach
            clientsQuery = sql`
                SELECT 
                    c.id,
                    c.name,
                    c.email,
                    c.status,
                    c."createdAt"
                FROM "Client" c
                WHERE c."coachId" = ${session.user.id}
                ORDER BY c.name ASC
            `;
        }

        const clients = await clientsQuery;

        // Transform the data to match expected format
        const availableClients = clients.map(client => ({
            id: client.id,
            name: client.name,
            email: client.email,
            status: client.status,
            createdAt: client.createdAt
        }));

        return NextResponse.json({
            clients: availableClients
        });

    } catch (error) {
        console.error('Get available clients error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

