import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useCoachAdminConversationId() {
    const { data: session } = useSession();
    const [conversationId, setConversationId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!session?.user || session.user.role !== 'coach') {
            setLoading(false);
            return;
        }

        const fetchConversationId = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(
                    `/api/chat/conversations/lookup?coachLookingForAdmin=true`
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
                console.error('Error fetching coach-admin conversation ID:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchConversationId();
    }, [session?.user?.id, session?.user?.role]);

    return { conversationId, loading, error };
}
