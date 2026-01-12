import { useState, useEffect } from 'react';

export const useGroupProgress = (groupId) => {
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProgressData = async () => {
            if (!groupId) {
                setLoading(false);
                setProgressData(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/groups/${groupId}/progress`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch group progress data');
                }

                const data = await response.json();
                setProgressData(data);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching group progress:', err);
                setProgressData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProgressData();
    }, [groupId]);

    return {
        progressData,
        loading,
        error,
        refetch: () => {
            if (groupId) {
                fetchProgressData();
            }
        }
    };
};
