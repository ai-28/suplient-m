import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { data: session } = useSession();

    const fetchClients = async () => {
        if (!session?.user?.id) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/clients/bycoach', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coachId: session.user.id
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn('Failed to fetch clients:', response.status, response.statusText, errorText);
                setError(`Failed to fetch clients: ${response.status} ${response.statusText}`);
                setClients([]); // Set empty array on error
                return;
            }

            const data = await response.json();
            setClients(data.clients || []);
        } catch (err) {
            console.warn('Error fetching clients:', err.message);
            setError(err.message);
            setClients([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            // Add a small delay to ensure the session is fully loaded
            const timeoutId = setTimeout(fetchClients, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [session?.user?.id]);

    const refetchClients = () => {
        fetchClients();
    };

    // Transform clients data for the CreateGroupDialog
    const availableClients = clients.map(client => ({
        id: client.id, // Client table ID
        userId: client.userId, // User table ID (from u.id as "userId" in the API)
        name: client.name,
        initials: client.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        email: client.email,
        phone: client.phone
    }));

    return {
        clients,
        availableClients,
        loading,
        error,
        refetchClients
    };
}
