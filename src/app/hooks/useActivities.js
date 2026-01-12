import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useActivities(options = {}) {
    const { data: session } = useSession();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    const {
        userId = session?.user?.id,
        clientId = null,
        type = null,
        limit = 50,
        offset = 0,
        autoFetch = true
    } = options;

    const fetchActivities = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (userId) params.append('userId', userId);
            if (clientId) params.append('clientId', clientId);
            if (type) params.append('type', type);
            params.append('limit', limit.toString());
            params.append('offset', offset.toString());

            const response = await fetch(`/api/activities?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch activities');
            }

            const data = await response.json();
            setActivities(data.activities || []);
        } catch (err) {
            console.error('Error fetching activities:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        if (!userId) return;

        try {
            const params = new URLSearchParams();
            if (userId) params.append('userId', userId);
            if (clientId) params.append('clientId', clientId);

            const response = await fetch(`/api/activities/stats?${params}`);

            if (response.ok) {
                const data = await response.json();
                setStats(data.stats || []);
            }
        } catch (err) {
            console.error('Error fetching activity stats:', err);
        }
    };

    const createActivity = async (activityData) => {
        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(activityData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create activity');
            }

            const result = await response.json();

            // Add the new activity to the list
            setActivities(prev => [result.activity, ...prev]);

            return result.activity;
        } catch (err) {
            console.error('Error creating activity:', err);
            throw err;
        }
    };

    const createSignupActivity = async (clientId = null) => {
        try {
            const response = await fetch('/api/activities/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, clientId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create signup activity');
            }

            const result = await response.json();

            // Add the new activity to the list
            setActivities(prev => [result.activity, ...prev]);

            return result.activity;
        } catch (err) {
            console.error('Error creating signup activity:', err);
            throw err;
        }
    };

    const createTaskCompletionActivity = async (taskData, clientId = null) => {
        try {
            const response = await fetch('/api/activities/task-completed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, clientId, taskData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create task completion activity');
            }

            const result = await response.json();

            // Add the new activity to the list
            setActivities(prev => [result.activity, ...prev]);

            return result.activity;
        } catch (err) {
            console.error('Error creating task completion activity:', err);
            throw err;
        }
    };

    const createDailyCheckinActivity = async (checkinData, clientId = null) => {
        try {
            const response = await fetch('/api/activities/daily-checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, clientId, checkinData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create daily check-in activity');
            }

            const result = await response.json();

            // Add the new activity to the list
            setActivities(prev => [result.activity, ...prev]);

            return result.activity;
        } catch (err) {
            console.error('Error creating daily check-in activity:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (autoFetch) {
            fetchActivities();
            fetchStats();
        }
    }, [userId, clientId, type, limit, offset, autoFetch]);

    // Calculate derived stats
    const totalPoints = activities.reduce((sum, activity) => sum + (activity.pointsEarned || 0), 0);
    const activitiesByType = activities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
    }, {});

    return {
        activities,
        stats,
        loading,
        error,
        totalPoints,
        activitiesByType,
        fetchActivities,
        fetchStats,
        createActivity,
        createSignupActivity,
        createTaskCompletionActivity,
        createDailyCheckinActivity,
        refetch: fetchActivities
    };
}
