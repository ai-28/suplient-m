import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get all admin communication data for coach
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coachId = session.user.id;

    // Get admin-coach conversations
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

    // Get admin-assigned tasks
    const tasks = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t."dueDate",
        t.status,
        t."createdAt",
        t."updatedAt",
        u.name as "assignedByName",
        u.id as "assignedById"
      FROM "Task" t
      JOIN "User" u ON t."assignedBy" = u.id
      WHERE t."coachId" = ${coachId}
      AND t."assignedBy" IS NOT NULL
      ORDER BY t."createdAt" DESC
      LIMIT 10
    `;

    // Get admin notes about this coach (if you want to show them)
    const notes = await sql`
      SELECT 
        n.id,
        n.title,
        n.description,
        n."createdAt",
        u.name as "createdByName"
      FROM "Note" n
      LEFT JOIN "User" u ON n."createdBy" = u.id
      WHERE n."coachId" = ${coachId}
      ORDER BY n."createdAt" DESC
      LIMIT 10
    `;

    // Calculate stats
    const stats = {
      unreadMessages: conversations.reduce((sum, conv) => sum + (parseInt(conv.unreadCount) || 0), 0),
      pendingTasks: tasks.filter(t => t.status !== 'completed').length,
      overdueTasks: tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueDate = new Date(t.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }).length,
      totalConversations: conversations.length,
      totalTasks: tasks.length,
      totalNotes: notes.length
    };

    return NextResponse.json({
      success: true,
      conversations: conversations,
      tasks: tasks,
      notes: notes,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching admin communication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
