import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const STORAGE_KEY = 'lastActiveUpdate';
const THROTTLE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const MIN_OFFLINE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Hook to update client's lastActive timestamp
 * Includes client-side throttling to prevent excessive API calls
 * 
 * Usage:
 * - Call updateLastActive() when client logs in
 * - Call updateLastActive() when client comes back online (with wasOffline flag)
 * - Hook automatically handles throttling via localStorage
 */
export function useUpdateLastActive() {
    const { data: session, status } = useSession();
    const wasOfflineRef = useRef(false);
    const offlineStartTimeRef = useRef(null);

    const updateLastActive = async (force = false) => {
        // Only update for clients
        if (status !== 'authenticated' || !session?.user || session.user.role !== 'client') {
            return;
        }

        // Client-side throttling: check localStorage
        if (!force) {
            const lastUpdate = localStorage.getItem(STORAGE_KEY);
            if (lastUpdate) {
                const timeSinceLastUpdate = Date.now() - parseInt(lastUpdate);
                
                // Don't update if last update was less than 1 hour ago
                if (timeSinceLastUpdate < THROTTLE_INTERVAL) {
                    console.log('⏱️ Last active update throttled (client-side)');
                    return;
                }
            }
        }

        try {
            // Send client's timezone offset to server
            const timezoneOffset = new Date().getTimezoneOffset(); // in minutes, negative for ahead of UTC
            const response = await fetch('/api/client/update-last-active', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timezoneOffset: timezoneOffset
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.updated) {
                    // Update localStorage with current timestamp
                    localStorage.setItem(STORAGE_KEY, Date.now().toString());
                    console.log('✅ Last active updated:', data.lastActive);
                } else {
                    console.log('⏱️ Last active update throttled (server-side)');
                }
            } else {
                console.error('Failed to update last active:', response.statusText);
            }
        } catch (error) {
            console.error('Error updating last active:', error);
        }
    };

    // Handle online/offline events
    useEffect(() => {
        if (status !== 'authenticated' || !session?.user || session.user.role !== 'client') {
            return;
        }

        const handleOffline = () => {
            wasOfflineRef.current = true;
            offlineStartTimeRef.current = Date.now();
            console.log('📴 Client went offline');
        };

        const handleOnline = () => {
            if (wasOfflineRef.current && offlineStartTimeRef.current) {
                const offlineDuration = Date.now() - offlineStartTimeRef.current;
                
                // Only update if offline for more than MIN_OFFLINE_TIME (5 minutes)
                if (offlineDuration > MIN_OFFLINE_TIME) {
                    console.log('📶 Client back online after', Math.round(offlineDuration / 1000 / 60), 'minutes');
                    updateLastActive();
                }
                
                wasOfflineRef.current = false;
                offlineStartTimeRef.current = null;
            }
        };

        // Check initial online status
        if (navigator.onLine) {
            // If online, check if we should update (e.g., on page load after being away)
            const lastUpdate = localStorage.getItem(STORAGE_KEY);
            if (!lastUpdate) {
                // First time, update immediately
                updateLastActive(true);
            } else {
                // Check if it's been more than 1 hour
                const timeSinceLastUpdate = Date.now() - parseInt(lastUpdate);
                if (timeSinceLastUpdate > THROTTLE_INTERVAL) {
                    updateLastActive();
                }
            }
        }

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [status, session?.user?.id, session?.user?.role]);

    return { updateLastActive };
}

