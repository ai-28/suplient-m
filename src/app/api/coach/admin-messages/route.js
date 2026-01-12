import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get all admin-coach conversations for coach
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coachId = session.user.id;

    // Get all admin-coach conversations
    const conversations = await sql`
      SELECT DISTINCT ON (c.id)
        c.id,
        c.type,
        c."createdAt",
        c."updatedAt",
        u.id as "adminId",
        u.name as "adminName",
        u.email as "adminEmail",
        cp."lastReadAt",
        cp."joinedAt",
        (
          SELECT COUNT(*)
          FROM "Message" m
          WHERE m."conversationId" = c.id
          AND m."createdAt" > COALESCE(cp."lastReadAt", cp."joinedAt")
          AND m."senderId" != ${coachId}
        ) as "unreadCount",
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'type', m.type,
            'createdAt', m."createdAt",
            'senderId', m."senderId",
            'senderName', u2.name
          )
          FROM "Message" m
          JOIN "User" u2 ON m."senderId" = u2.id
          WHERE m."conversationId" = c.id
          ORDER BY m."createdAt" DESC
          LIMIT 1
        ) as "lastMessage"
      FROM "Conversation" c
      JOIN "ConversationParticipant" cp ON c.id = cp."conversationId" AND cp."userId" = ${coachId} AND cp."isActive" = true
      JOIN "ConversationParticipant" cp2 ON c.id = cp2."conversationId" AND cp2."isActive" = true AND cp2."userId" != ${coachId}
      JOIN "User" u ON cp2."userId" = u.id AND u.role = 'admin'
      WHERE c.type = 'admin_coach'
      AND c."isActive" = true
      ORDER BY c.id, c."updatedAt" DESC
      LIMIT 100
    `;

    return NextResponse.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
