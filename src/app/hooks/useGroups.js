import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useGroups() {
    const { data: session } = useSession();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchGroups = async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/groups', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch groups');
            }

            const data = await response.json();

            if (data.success) {
                setGroups(data.groups);
            } else {
                throw new Error(data.error || 'Failed to fetch groups');
            }
        } catch (err) {
            console.error('Error fetching groups:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateGroupStage = async (groupId, newStage) => {
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ stage: newStage }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update group stage');
            }

            const data = await response.json();

            if (data.success) {
                // Update the group in the local state
                setGroups(prevGroups =>
                    prevGroups.map(group =>
                        group.id === groupId
                            ? { ...group, stage: newStage }
                            : group
                    )
                );
                return data.group;
            } else {
                throw new Error(data.error || 'Failed to update group stage');
            }
        } catch (err) {
            console.error('Error updating group stage:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [session?.user?.id]);

    return {
        groups,
        loading,
        error,
        refetchGroups: fetchGroups,
        updateGroupStage
    };
}