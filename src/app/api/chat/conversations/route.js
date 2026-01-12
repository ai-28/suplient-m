import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await chatRepo.getUserConversations(session.user.id);

    return NextResponse.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, clientId, groupId } = await request.json();

    let conversationId;

    if (type === 'personal' && clientId) {
      // Create personal conversation between coach and client
      if (session.user.role !== 'coach') {
        return NextResponse.json(
          { error: 'Only coaches can create personal conversations' },
          { status: 403 }
        );
      }

      conversationId = await chatRepo.createPersonalConversation(session.user.id, clientId);
    } else if (type === 'group' && groupId) {
      // Create group conversation
      if (session.user.role !== 'coach') {
        return NextResponse.json(
          { error: 'Only coaches can create group conversations' },
          { status: 403 }
        );
      }

      conversationId = await chatRepo.createGroupConversation(groupId, session.user.id);
    } else {
      return NextResponse.json(
        { error: 'Invalid conversation type or missing parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      conversationId
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

