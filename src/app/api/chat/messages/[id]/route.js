import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';

// PUT - Edit a message
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const updatedMessage = await chatRepo.editMessage(
      messageId,
      session.user.id,
      content.trim()
    );

    // Emit real-time update via socket
    try {
      const { globalSocketIO } = global;
      if (globalSocketIO) {
        // Use the actual room naming convention from server.js (conversation_${id})
        const room = `conversation_${updatedMessage.conversationId}`;

        const eventData = {
          messageId: updatedMessage.id,
          content: updatedMessage.content,
          isEdited: updatedMessage.isEdited,
          editedAt: updatedMessage.editedAt,
          conversationId: String(updatedMessage.conversationId) // Ensure it's a string
        };

        // Emit to the room
        globalSocketIO.to(room).emit('message_edited', eventData);
      }
    } catch (socketError) {
      console.error('Error emitting message_edited event:', socketError);
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage
    });
  } catch (error) {
    console.error('Error editing message:', error);

    if (error.message === 'Message not found') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (error.message === 'Not authorized to edit this message') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a message (soft delete)
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;

    const deletedMessage = await chatRepo.deleteMessage(
      messageId,
      session.user.id
    );

    // Emit real-time update via socket - both sides will see the deleted placeholder
    try {
      const { globalSocketIO } = global;
      if (globalSocketIO) {
        // Use the actual room naming convention from server.js (conversation_${id})
        const room = `conversation_${deletedMessage.conversationId}`;

        const eventData = {
          messageId: deletedMessage.id,
          content: deletedMessage.content,
          isDeleted: deletedMessage.isDeleted,
          deletedAt: deletedMessage.deletedAt,
          conversationId: String(deletedMessage.conversationId) // Ensure it's a string
        };

        // Emit to the room
        globalSocketIO.to(room).emit('message_deleted', eventData);
      }
    } catch (socketError) {
      console.error('Error emitting message_deleted event:', socketError);
    }

    return NextResponse.json({
      success: true,
      message: deletedMessage
    });
  } catch (error) {
    console.error('Error deleting message:', error);

    if (error.message === 'Message not found') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (error.message === 'Not authorized to delete this message') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

