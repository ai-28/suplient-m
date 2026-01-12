import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get or create admin-coach conversation
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachId } = await params;

    // Verify coach exists and is actually a coach
    const coach = await sql`
      SELECT id, name, role FROM "User" 
      WHERE id = ${coachId} AND role = 'coach' AND "isActive" = true
    `;

    if (coach.length === 0) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    // Get or create conversation
    let conversationId = await chatRepo.getAdminCoachConversationId(session.user.id, coachId);
    
    if (!conversationId) {
      conversationId = await chatRepo.createAdminCoachConversation(session.user.id, coachId);
    }

    // Get conversation details
    const conversation = await chatRepo.getConversationById(conversationId);
    const participants = await chatRepo.getConversationParticipants(conversationId);

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role
        }))
      }
    });
  } catch (error) {
    console.error('Error getting admin-coach conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
