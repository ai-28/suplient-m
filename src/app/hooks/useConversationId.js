import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useConversationId(clientId, coachId) {
    const { data: session } = useSession();
    const [conversationId, setConversationId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!clientId || !coachId || !session?.user) {
            setLoading(false);
            return;
        }

        const fetchConversationId = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(
                    `/api/chat/conversations/lookup?clientId=${clientId}&coachId=${coachId}`
                );

                if (!response.ok) {
                    throw new Error('Failed to lookup conversation');
                }

                const data = await response.json();

                if (data.success) {
                    setConversationId(data.conversationId);
                } else {
                    throw new Error(data.error || 'Failed to get conversation ID');
                }
            } catch (err) {
                console.error('Error fetching conversation ID:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchConversationId();
    }, [clientId, coachId, session?.user?.id]);

    return { conversationId, loading, error };
}
