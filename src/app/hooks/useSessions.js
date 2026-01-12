import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useSessions() {
    const { data: session } = useSession();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSessions = async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/sessions', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch sessions');
            }

            const data = await response.json();
            const fetchedSessions = data.sessions;

            // Debug: Log first session to check data structure
            if (fetchedSessions && fetchedSessions.length > 0) {
                console.log('📋 First session data:', {
                    id: fetchedSessions[0].id,
                    clientName: fetchedSessions[0].clientName,
                    clientAvatar: fetchedSessions[0].clientAvatar,
                    clientId: fetchedSessions[0].clientId
                });
            }

            // Transform the data to match the expected format for the Sessions page
            const transformedSessions = fetchedSessions.map(session => ({
                id: session.id,
                title: session.title,
                description: session.description,
                date: formatSessionDate(session.sessionDate, session.sessionTime),
                sessionDate: session.sessionDate,
                sessionTime: session.sessionTime,
                duration: session.duration,
                sessionType: session.sessionType,
                client: session.clientName,
                clientAvatar: session.clientAvatar, // Include client avatar
                group: session.groupName,
                clientId: session.clientId,
                groupId: session.groupId,
                location: session.location,
                meetingLink: session.meetingLink,
                status: session.status,
                mood: session.mood, // Keep original mood value for editing
                moodEmoji: getMoodEmoji(session.mood), // Add emoji version for display
                notes: session.notes,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                // Additional fields for compatibility
                type: session.sessionType === 'individual' ? '1-1' : 'Group',
                actions: ['view', 'edit', 'message']
            }));

            setSessions(transformedSessions);
        } catch (err) {
            console.error("Error fetching sessions:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createSession = async (sessionData) => {
        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create session');
            }

            const result = await response.json();
            await fetchSessions(); // Refresh the sessions list
            return result.session;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    };

    const updateSession = async (sessionId, updateData) => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update session');
            }

            const result = await response.json();
            await fetchSessions(); // Refresh the sessions list
            return result.session;
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    };

    const deleteSession = async (sessionId) => {
        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete session');
            }

            await fetchSessions(); // Refresh the sessions list
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [session?.user?.id]);

    return {
        sessions,
        loading,
        error,
        refetchSessions: fetchSessions,
        createSession,
        updateSession,
        deleteSession
    };
}

// Helper function to format session date and time
function formatSessionDate(sessionDate, sessionTime) {
    if (!sessionDate || !sessionTime) return 'No date/time';

    const date = new Date(sessionDate);
    const time = sessionTime;

    // Format date as "DD MMM HH:MM"
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const timeFormatted = time.substring(0, 5); // Get HH:MM from HH:MM:SS

    return `${day} ${month} ${timeFormatted}`;
}

// Helper function to convert mood to emoji
function getMoodEmoji(mood) {
    const moodMap = {
        'excellent': '😊',
        'good': '🙂',
        'neutral': '😐',
        'poor': '😞',
        'terrible': '😢'
    };
    return moodMap[mood] || '😐';
}
