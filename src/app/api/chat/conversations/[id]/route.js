import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = params;

    // Get conversation details
    const conversation = await chatRepo.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify user is participant
    const participants = await chatRepo.getConversationParticipants(conversationId);
    const isParticipant = participants.some(p => p.id === session.user.id);

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        participants
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

