import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get messages from admin-coach conversation
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachId } = await params;

    // Get or create conversation
    let conversationId = await chatRepo.getAdminCoachConversationId(session.user.id, coachId);
    
    if (!conversationId) {
      conversationId = await chatRepo.createAdminCoachConversation(session.user.id, coachId);
    }

    // Get messages
    const limit = parseInt(request.nextUrl.searchParams.get('limit')) || 50;
    const offset = parseInt(request.nextUrl.searchParams.get('offset')) || 0;
    
    const messages = await chatRepo.getConversationMessages(conversationId, limit, offset);

    return NextResponse.json({
      success: true,
      messages: messages,
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send a message in admin-coach conversation
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachId } = await params;
    const { content, type = 'text', replyToId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversationId = await chatRepo.getAdminCoachConversationId(session.user.id, coachId);
    
    if (!conversationId) {
      conversationId = await chatRepo.createAdminCoachConversation(session.user.id, coachId);
    }

    // Send message
    const message = await chatRepo.sendMessage(
      conversationId, 
      session.user.id, 
      content, 
      type,
      { replyToId }
    );

    return NextResponse.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
