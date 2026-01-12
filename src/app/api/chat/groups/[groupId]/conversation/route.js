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

        const { groupId } = await params;

        if (!groupId) {
            return NextResponse.json(
                { error: 'Group ID is required' },
                { status: 400 }
            );
        }

        // Get or create group conversation
        let conversationId = await chatRepo.getGroupConversationId(groupId);

        if (!conversationId) {
            // Create group conversation if it doesn't exist
            conversationId = await chatRepo.createGroupConversation(groupId, session.user.id);
        } else {
            // Ensure user is participant even for existing conversations
            conversationId = await chatRepo.createGroupConversation(groupId, session.user.id);
        }

        return NextResponse.json({
            success: true,
            conversationId
        });
    } catch (error) {
        console.error('Error getting group conversation:', error);
        return NextResponse.json(
            { error: 'Failed to get group conversation' },
            { status: 500 }
        );
    }
}
