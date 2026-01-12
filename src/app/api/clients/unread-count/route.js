import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption.js';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');

        if (!conversationId) {
            return NextResponse.json({ message: "Conversation ID is required" }, { status: 400 });
        }

        // Get conversation participants to find the client
        const participants = await sql`
            SELECT 
                cp."userId",
                u.name,
                u.role,
                c.id as "clientId"
            FROM "ConversationParticipant" cp
            JOIN "User" u ON u.id = cp."userId"
            LEFT JOIN "Client" c ON c."userId" = cp."userId"
            WHERE cp."conversationId" = ${conversationId}
        `;

        // Find the client (non-coach participant)
        const client = participants.find(p => p.role === 'client');
        const coach = participants.find(p => p.role === 'coach');

        if (!client || !coach) {
            return NextResponse.json({ message: "Invalid conversation participants" }, { status: 400 });
        }

        // Calculate unread messages count for this specific conversation
        const unreadResult = await sql`
            SELECT COUNT(*) as "unreadCount"
            FROM "Message" m
            JOIN "Conversation" conv ON conv.id = m."conversationId"
            JOIN "ConversationParticipant" cp_coach ON cp_coach."conversationId" = conv.id AND cp_coach."userId" = ${coach.userId}
            WHERE conv.id = ${conversationId}
            AND m."senderId" = ${client.userId}
            AND m."createdAt" > COALESCE(cp_coach."lastReadAt", cp_coach."joinedAt", '1970-01-01'::timestamp)
        `;

        const unreadCount = parseInt(unreadResult[0]?.unreadCount || 0);

        return NextResponse.json({
            success: true,
            conversationId,
            clientId: client.clientId,
            clientName: client.name,
            unreadCount
        });

    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
