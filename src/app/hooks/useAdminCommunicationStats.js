import { useState, useEffect } from 'react';

export function useAdminCommunicationStats() {
  const [stats, setStats] = useState({
    unreadMessages: 0,
    pendingTasks: 0,
    overdueTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/coach/admin-communication');
        const data = await response.json();

        if (data.success) {
          setStats({
            unreadMessages: data.stats.unreadMessages || 0,
            pendingTasks: data.stats.pendingTasks || 0,
            overdueTasks: data.stats.overdueTasks || 0
          });
        }
      } catch (error) {
        console.error('Error fetching admin communication stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const totalNotifications = stats.unreadMessages + stats.pendingTasks;

  return {
    ...stats,
    totalNotifications,
    loading
  };
}
