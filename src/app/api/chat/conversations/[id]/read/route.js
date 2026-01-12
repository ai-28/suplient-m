import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { chatRepo } from '@/app/lib/db/chatSchema';

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: conversationId } = await params;

        // Verify user is participant
        const participants = await chatRepo.getConversationParticipants(conversationId);
        const isParticipant = participants.some(p => p.id === session.user.id);

        if (!isParticipant) {
            return NextResponse.json(
                { error: 'Not authorized to access this conversation' },
                { status: 403 }
            );
        }

        // Mark messages as read
        await chatRepo.markMessagesAsRead(conversationId, session.user.id);

        // Emit real-time update for unread message counts
        try {
            const { io } = await import('socket.io');
            if (io && global.globalSocketIO) {
                // Get all participants to notify them of the read status update
                const participants = await chatRepo.getConversationParticipants(conversationId);

                for (const participant of participants) {
                    global.globalSocketIO.to(`notifications_${participant.id}`).emit('update_unread_count', {
                        conversationId,
                        participantId: participant.id
                    });
                }
            }
        } catch (socketError) {
            console.error('❌ Error emitting unread count updates:', socketError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
