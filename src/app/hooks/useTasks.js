import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { data: session } = useSession();

    const fetchTasks = useCallback(async () => {
        if (!session?.user?.id) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/tasks/bycoachId', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coachId: session.user.id
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }

            const data = await response.json();
            setTasks(data.tasks || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const refetchTasks = () => {
        fetchTasks();
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            console.log('🔄 useTasks: Updating task status:', { taskId, newStatus });

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus
                }),
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ API Error:', errorData);
                throw new Error(errorData.error || 'Failed to update task status');
            }

            const result = await response.json();
            console.log('✅ API Success:', result);

            // Refetch tasks to get updated data
            console.log('🔄 Refetching tasks...');
            await fetchTasks();
            console.log('✅ Tasks refetched successfully');
        } catch (error) {
            console.error('❌ Error updating task status:', error);
            throw error;
        }
    };

    // Categorize tasks by type
    // Personal tasks: created by coach themselves (no assignedBy)
    const personalTasks = tasks.filter(task => task.taskType === 'personal' && !task.assignedBy);
    const clientTasks = tasks.filter(task => task.taskType === 'client');
    const groupTasks = tasks.filter(task => task.taskType === 'group');
    // Admin-assigned tasks: tasks assigned by admin (has assignedBy field)
    const adminAssignedTasks = tasks.filter(task => task.assignedBy != null);

    // Calculate stats
    const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(task => task.status === 'completed').length,
        overdueTasks: tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate < today && task.status !== 'completed';
        }).length,
        personalTasks: personalTasks.length,
        clientTasks: clientTasks.length,
        groupTasks: groupTasks.length,
        adminAssignedTasks: adminAssignedTasks.length
    };

    return {
        tasks,
        personalTasks,
        clientTasks,
        groupTasks,
        adminAssignedTasks,
        stats,
        loading,
        error,
        refetchTasks,
        updateTaskStatus
    };
}
