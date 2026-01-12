import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function useNotifications(options = {}) {
    const { limit = 50, isRead = null, type = null, priority = null } = options;
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit.toString());
            if (isRead !== null) params.append('isRead', isRead.toString());
            if (type) params.append('type', type);
            if (priority) params.append('priority', priority);

            const response = await fetch(`/api/notifications?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err.message);
            toast.error(err.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, limit, isRead, type, priority]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Listen for real-time notifications
    useEffect(() => {
        const handleNewNotification = (event) => {
            const notification = event.detail;

            // Check if notifications are enabled for this user
            const notificationsEnabled = localStorage.getItem('notificationsEnabled');
            if (notificationsEnabled === 'false') {
                console.log('Notifications disabled, skipping notification:', notification.id);
                return;
            }

            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    console.log('Notification already exists, skipping duplicate:', notification.id);
                    return prev;
                }

                // Add the new notification to the beginning of the list
                const newNotifications = [notification, ...prev];

                // Update unread count only if it's a new notification
                setUnreadCount(prevCount => prevCount + 1);

                return newNotifications;
            });

            // Show toast notification
            toast.success(notification.title, {
                description: notification.message,
                duration: 5000,
            });
        };

        // Add event listener for real-time notifications
        window.addEventListener('new_notification', handleNewNotification);

        // Cleanup event listener
        return () => {
            window.removeEventListener('new_notification', handleNewNotification);
        };
    }, []);

    const markAsRead = useCallback(async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'PUT',
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            // Update local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, isRead: true, readAt: new Date().toISOString() }
                        : notification
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
            toast.error('Failed to mark notification as read');
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
            });

            if (!response.ok) {
                throw new Error('Failed to clear all notifications');
            }

            const data = await response.json();

            // Clear all notifications from local state since they're deleted
            setNotifications([]);
            setUnreadCount(0);

            toast.success(data.message || 'All notifications cleared');
        } catch (err) {
            console.error('Error clearing all notifications:', err);
            toast.error('Failed to clear all notifications');
        }
    }, []);

    const deleteNotification = useCallback(async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            // Update local state
            setNotifications(prev => prev.filter(n => n.id !== notificationId));

            // Decrease unread count if the deleted notification was unread
            const deletedNotification = notifications.find(n => n.id === notificationId);
            if (deletedNotification && !deletedNotification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            toast.success('Notification deleted');
        } catch (err) {
            console.error('Error deleting notification:', err);
            toast.error('Failed to delete notification');
        }
    }, [notifications]);

    const createNotification = useCallback(async (notificationData) => {
        if (!session?.user?.id) {
            toast.error('You must be logged in to create a notification.');
            return null;
        }

        try {
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notificationData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create notification');
            }

            const newNotification = await response.json();
            toast.success('Notification created successfully!');
            fetchNotifications(); // Refresh notifications
            return newNotification;
        } catch (err) {
            console.error('Error creating notification:', err);
            toast.error(err.message || 'Failed to create notification');
            return null;
        }
    }, [session?.user?.id, fetchNotifications]);

    return {
        notifications,
        loading,
        error,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        createNotification,
    };
}
