import { useState, useEffect } from 'react';

export const useClientProgress = (clientId) => {
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProgressData = async () => {
            if (!clientId) {
                setLoading(false);
                setProgressData(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/clients/${clientId}/progress`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch progress data');
                }

                const data = await response.json();
                setProgressData(data);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching client progress:', err);
                setProgressData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProgressData();
    }, [clientId]);

    return {
        progressData,
        loading,
        error,
        refetch: () => {
            if (clientId) {
                fetchProgressData();
            }
        }
    };
};
