import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useClientCoach() {
    const { data: session } = useSession();
    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!session?.user || session.user.role !== 'client') {
            setLoading(false);
            return;
        }

        const fetchCoach = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/client/coach');

                if (!response.ok) {
                    throw new Error('Failed to fetch coach information');
                }

                const data = await response.json();

                if (data.success) {
                    setCoach(data.coach);
                } else {
                    throw new Error(data.error || 'Failed to get coach information');
                }
            } catch (err) {
                console.error('Error fetching coach:', err);
                console.error('Error details:', err.message);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCoach();
    }, [session?.user]);

    return { coach, loading, error };
}
