import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/chat/conversations/[id]/client - Get clientId from conversationId
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get conversation participants and find the client
    const participants = await sql`
      SELECT 
        cp."userId",
        u.role,
        c.id as "clientId"
      FROM "ConversationParticipant" cp
      JOIN "User" u ON u.id = cp."userId"
      LEFT JOIN "Client" c ON c."userId" = cp."userId"
      WHERE cp."conversationId" = ${conversationId}
      AND cp."isActive" = true
    `;

    // Find the client participant (not the coach)
    const clientParticipant = participants.find(p => p.role === 'client' && p.clientId);
    const coachParticipant = participants.find(p => p.role === 'coach' && p.userId === session.user.id);

    // Verify the current user is the coach in this conversation
    if (!coachParticipant) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    if (!clientParticipant) {
      return NextResponse.json(
        { error: 'Client not found in conversation' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clientId: clientParticipant.clientId
    });
  } catch (error) {
    console.error('Error getting client from conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

