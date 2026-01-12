import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useGroupsForTasks() {
    const { data: session } = useSession();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchGroups = async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/groups', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch groups');
            }

            const data = await response.json();
            const fetchedGroups = data.groups;

            // Transform the data to match the expected format for tasks
            const transformedGroups = fetchedGroups.map(group => ({
                id: group.id,
                name: group.name,
                memberCount: group.memberCount || 0,
                avatar: group.name ? group.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'G',
                // Additional fields from database
                description: group.description,
                stage: group.stage,
                focusArea: group.focusArea,
                capacity: group.capacity,
                frequency: group.frequency,
                duration: group.duration,
                location: group.location,
                selectedMembers: group.selectedMembers || [],
                createdAt: group.createdAt,
                updatedAt: group.updatedAt
            }));

            setGroups(transformedGroups);
        } catch (err) {
            console.error("Error fetching groups:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [session?.user?.id]);

    return { groups, loading, error, refetchGroups: fetchGroups };
}
