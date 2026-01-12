import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption.js";
import { sql } from "@/app/lib/db/postgresql.js";

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Get the current user (coach) to filter clients
        const email = session.user.email;
        const userResult = await sql`
            SELECT id FROM "User" WHERE email = ${email}
        `;

        if (userResult.length === 0) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const coachId = userResult[0].id;

        // Fetch clients with their scheduled sessions (robust query)
        const clients = await sql`
            SELECT 
                c.id,
                c."userId",
                u.name,
                u.email,
                u.avatar,
                c.type,
                c.status,
                c.mood,
                c."lastActive",
                c."createdAt",
                c."updatedAt",
                c."referralSource",
                c."primaryConcerns",
                c."stageId",
                COALESCE(
                    (
                        SELECT (s."sessionDate" + s."sessionTime") as "scheduledDate"
                        FROM "Session" s
                        WHERE s."clientId" = c.id 
                        AND s.status = 'scheduled'
                        AND (s."sessionDate" + s."sessionTime") > NOW()
                        ORDER BY (s."sessionDate" + s."sessionTime") ASC
                        LIMIT 1
                    ), 
                    NULL
                ) as "scheduledSession",
                COALESCE(
                    (
                        SELECT COUNT(*)
                        FROM "Message" m
                        JOIN "Conversation" conv ON conv.id = m."conversationId"
                        JOIN "ConversationParticipant" cp_coach ON cp_coach."conversationId" = conv.id AND cp_coach."userId" = ${coachId}
                        WHERE conv.type = 'personal'
                        AND conv."createdBy" = ${coachId}
                        AND m."senderId" = c."userId"
                        AND m."createdAt" > COALESCE(cp_coach."lastReadAt", cp_coach."joinedAt", '1970-01-01'::timestamp)
                    ), 
                    0
                ) as "unreadMessages",
                COALESCE(
                    (
                        SELECT m.content
                        FROM "Message" m
                        JOIN "Conversation" conv ON conv.id = m."conversationId"
                        JOIN "ConversationParticipant" cp_coach ON cp_coach."conversationId" = conv.id AND cp_coach."userId" = ${coachId}
                        WHERE conv.type = 'personal'
                        AND conv."createdBy" = ${coachId}
                        AND (m."senderId" = c."userId" OR m."senderId" = ${coachId})
                        ORDER BY m."createdAt" DESC
                        LIMIT 1
                    ), 
                    'No recent messages'
                ) as "lastMessage",
                COALESCE(
                    (
                        SELECT n.description
                        FROM "Note" n
                        WHERE n."clientId" = c.id
                        ORDER BY n."createdAt" DESC
                        LIMIT 1
                    ), 
                    'No recent notes'
                ) as "lastNote"
            FROM "Client" c
            JOIN "User" u ON c."userId" = u.id
            WHERE c."coachId" = ${coachId}
            ORDER BY c."lastActive" DESC NULLS LAST, c."createdAt" DESC
        `;


        // Transform the data to match the expected format
        const formattedClients = clients.map(client => {
            return {
                id: client.id,
                userId: client.userId, // Include userId for notifications
                name: client.name,
                email: client.email, // Include email field
                avatar: client.avatar, // Include avatar field
                type: client.type || 'Personal',
                status: client.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1).toLowerCase() : 'Active',
                lastActive: formatDate(client.lastActive), // ISO string or null
                created: formatDate(client.createdAt),
                mood: client.mood || '😐',
                stage: client.stageId || determineStage(client.status, client.type),
                scheduledSession: client.scheduledSession ? formatDate(client.scheduledSession) : null,
                unreadMessages: client.unreadMessages,
                lastMessage: client.lastMessage,
                lastNote: client.lastNote
            };
        });

        return NextResponse.json({
            status: true,
            message: 'Clients fetched successfully',
            clients: formattedClients,
            count: formattedClients.length
        });

    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json(
            {
                status: false,
                message: 'Failed to fetch clients',
                error: error.message
            },
            { status: 500 }
        );
    }
}

// Helper function to format date
// Returns ISO string (UTC) so client can format in their local timezone
function formatDate(dateString) {
    if (!dateString) return null; // Return null so client can handle formatting

    // PostgreSQL TIMESTAMP (without timezone) stores values as-is
    // Since we store UTC using (NOW() AT TIME ZONE 'UTC'), we need to ensure
    // the returned value is treated as UTC when parsed by JavaScript
    let date;
    if (typeof dateString === 'string') {
        // PostgreSQL returns TIMESTAMP as string without timezone
        // Since we stored it as UTC, we need to append 'Z' to indicate UTC
        const trimmed = dateString.trim();
        if (!trimmed.endsWith('Z') && !trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
            // No timezone indicator - treat as UTC (since we stored it as UTC)
            date = new Date(trimmed + 'Z');
        } else {
            date = new Date(trimmed);
        }
    } else if (dateString instanceof Date) {
        date = dateString;
    } else {
        // Handle Date object from PostgreSQL
        date = new Date(dateString);
    }

    // Return ISO string (always UTC, ends with 'Z')
    // Client will parse this and convert to local timezone
    return date.toISOString();
}

// Helper function to determine stage based on status and type
function determineStage(status, type) {
    if (status === 'Inactive') return 'inactive';
    if (status === 'Completed') return 'completed';
    if (type?.toLowerCase() === 'group') return 'group';
    if (type?.toLowerCase() === 'personal') return 'personal';
    return 'light';
}

export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is a coach
        const user = await sql`
            SELECT id, role FROM "User" WHERE id = ${session.user.id}
        `;

        if (user.length === 0 || user[0].role !== 'coach') {
            return NextResponse.json(
                { error: 'Only coaches can update client status' },
                { status: 403 }
            );
        }

        const coachId = session.user.id;
        const body = await request.json();
        const { id, status } = body;

        // Validate required fields
        if (!id || !status) {
            return NextResponse.json(
                { error: 'Client ID and status are required' },
                { status: 400 }
            );
        }

        // Verify the client belongs to this coach
        const clientCheck = await sql`
            SELECT c.id, c."userId", c."coachId"
            FROM "Client" c
            WHERE c.id = ${id} AND c."coachId" = ${coachId}
        `;

        if (clientCheck.length === 0) {
            return NextResponse.json(
                { error: 'Client not found or you do not have permission to update this client' },
                { status: 404 }
            );
        }

        const userId = clientCheck[0].userId;

        // Update status in User table
        const updatedUser = await sql`
            UPDATE "User" 
            SET 
                "isActive" = ${status === 'active' || status === 'Active'},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${userId} AND role = 'client'
            RETURNING id, name, email, phone, "address", "coachId", bio, role, "isActive", "createdAt", "updatedAt"
        `;

        if (updatedUser.length === 0) {
            return NextResponse.json(
                { error: 'Client not found or update failed' },
                { status: 404 }
            );
        }

        // Update status in Client table
        const statusValue = status.toLowerCase() === 'active' ? 'active' : 'inactive';
        const updatedClient = await sql`
            UPDATE "Client" 
            SET 
                status = ${statusValue},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${id} AND "coachId" = ${coachId}
            RETURNING id, status, "updatedAt"
        `;

        if (updatedClient.length === 0) {
            return NextResponse.json(
                { error: 'Failed to update client status' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Client status updated successfully',
            client: {
                id: updatedUser[0].id,
                status: updatedClient[0].status
            }
        });

    } catch (error) {
        console.error('Error updating client status:', error);
        return NextResponse.json(
            { error: 'Failed to update client status' },
            { status: 500 }
        );
    }
}
