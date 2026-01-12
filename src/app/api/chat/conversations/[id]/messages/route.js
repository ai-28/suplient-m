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

    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Verify user is participant
    const participants = await chatRepo.getConversationParticipants(conversationId);
    const isParticipant = participants.some(p => p.id === session.user.id);

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Not authorized to access this conversation' },
        { status: 403 }
      );
    }

    const messages = await chatRepo.getConversationMessages(conversationId, limit, offset);

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { content, type = 'text', replyToId, fileUrl, fileName, fileSize, fileType, audioUrl, audioDuration, waveformData } = await request.json();

    if (!content && !fileUrl && !audioUrl) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // For chat messages: use admin ID if impersonating, otherwise use current user ID
    // This ensures chat messages show as sent by the admin, not the impersonated user
    const senderId = session.user.isImpersonating && session.user.originalAdminId
      ? session.user.originalAdminId
      : session.user.id;

    // Verify user is participant (check both current user and admin if impersonating)
    const participants = await chatRepo.getConversationParticipants(conversationId);
    const isParticipant = participants.some(p =>
      p.id === session.user.id ||
      (session.user.isImpersonating && session.user.originalAdminId && p.id === session.user.originalAdminId)
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Not authorized to send messages to this conversation' },
        { status: 403 }
      );
    }

    // For impersonation: we need to add the admin as a participant if not already
    if (session.user.isImpersonating && session.user.originalAdminId) {
      const isAdminParticipant = participants.some(p => p.id === session.user.originalAdminId);
      if (!isAdminParticipant) {
        // Add admin as participant to this conversation
        await chatRepo.addParticipant(conversationId, session.user.originalAdminId);
      }
    }

    const message = await chatRepo.sendMessage(conversationId, senderId, content, type, {
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      audioUrl,
      audioDuration,
      waveformData
    });

    // Fetch the full message with replyTo data
    const fullMessage = await chatRepo.getMessageById(message.id);

    // Emit socket event with full message data including replyTo
    try {
      const { globalSocketIO } = global;
      if (globalSocketIO) {
        const room = `conversation_${conversationId}`;
        const socketMessage = {
          ...fullMessage,
          senderId: senderId,
          senderName: session.user.isImpersonating && session.user.originalAdminName
            ? session.user.originalAdminName
            : session.user.name,
          senderRole: session.user.isImpersonating && session.user.originalAdminRole
            ? session.user.originalAdminRole
            : session.user.role,
          timestamp: fullMessage.createdAt,
          createdAt: fullMessage.createdAt
        };
        globalSocketIO.to(room).emit('new_message', socketMessage);
      }
    } catch (socketError) {
      console.error('Error emitting new_message socket event:', socketError);
    }

    // Create persistent notifications and emit real-time updates
    try {
      const { NotificationService } = await import('@/app/lib/services/NotificationService');

      // Get the global socket instance to check if users are in the conversation
      const { globalSocketIO } = global;

      // Create notifications for all participants except the sender
      for (const participant of participants) {
        if (participant.id !== session.user.id) {
          // Check if the participant is currently in this conversation
          let isInConversation = false;
          if (globalSocketIO) {
            try {
              const room = globalSocketIO.sockets.adapter.rooms.get(`conversation_${conversationId}`);
              if (room && room.size > 0) {
                // Check if any socket in this room belongs to the participant
                for (const socketId of room) {
                  const socket = globalSocketIO.sockets.sockets.get(socketId);
                  if (socket && socket.userId && socket.userId === participant.id) {
                    isInConversation = true;
                    console.log(`User ${participant.id} found in conversation ${conversationId} via socket ${socketId}`);
                    break;
                  }
                }
              } else {
                console.log(`No active sockets in conversation room: conversation_${conversationId}`);
              }
            } catch (roomError) {
              console.error('Error checking conversation room:', roomError);
              // If we can't check the room, assume user is not in conversation (safer to send notification)
              isInConversation = false;
            }
          } else {
            console.log('Global socket not available, will create notification');
          }

          // Only create notification if user is NOT currently in the conversation
          if (!isInConversation) {
            console.log(`Creating notification for user ${participant.id} - not in conversation ${conversationId}`);
            // Use admin info for notifications if impersonating
            const notifSenderId = session.user.isImpersonating && session.user.originalAdminId
              ? session.user.originalAdminId
              : session.user.id;
            const notifSenderName = session.user.isImpersonating && session.user.originalAdminName
              ? session.user.originalAdminName
              : session.user.name;
            const notifSenderRole = session.user.isImpersonating && session.user.originalAdminRole
              ? session.user.originalAdminRole
              : session.user.role;

            await NotificationService.notifyNewMessage(
              participant.id,
              notifSenderId,
              notifSenderName,
              notifSenderRole,
              conversationId,
              content,
              type
            );
          } else {
            console.log(`Skipping notification for user ${participant.id} - currently in conversation ${conversationId}`);
          }
        }

        // Emit real-time update for unread message counts
        console.log(`Emitting unread count update for participant ${participant.id} in conversation ${conversationId}`);
        const emitResult = await NotificationService.emitUnreadCountUpdate(conversationId, participant.id);
        console.log(`Unread count update result for ${participant.id}:`, emitResult);
      }
    } catch (notificationError) {
      console.error('Error creating notifications or emitting updates:', notificationError);
    }

    // Return message with admin info if impersonating
    const senderName = session.user.isImpersonating && session.user.originalAdminName
      ? session.user.originalAdminName
      : session.user.name;
    const senderRole = session.user.isImpersonating && session.user.originalAdminRole
      ? session.user.originalAdminRole
      : session.user.role;

    return NextResponse.json({
      success: true,
      message: {
        ...fullMessage,
        senderId: senderId,
        senderName: senderName,
        senderRole: senderRole,
        timestamp: fullMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

