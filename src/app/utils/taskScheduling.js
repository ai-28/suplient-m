import { addDays, format, isAfter, isBefore, isToday, differenceInDays, startOfDay } from 'date-fns';

/**
 * Calculate the actual date when a program element should be available
 */
export function calculateElementDate(startDate, scheduledDay) {
  return addDays(startDate, scheduledDay - 1);
}

/**
 * Calculate the due date for a task element
 */
export function calculateDueDate(scheduledDate, dueInDays) {
  if (!dueInDays) return scheduledDate;
  return addDays(scheduledDate, dueInDays);
}

/**
 * Determine the current status of a task
 */
export function getTaskStatus(scheduledDate, dueDate, isCompleted, currentDate = new Date()) {
  if (isCompleted) return 'completed';

  const today = startOfDay(currentDate);
  const scheduled = startOfDay(scheduledDate);
  const due = startOfDay(dueDate);

  if (isAfter(scheduled, today)) return 'upcoming';
  if (isAfter(today, due)) return 'overdue';
  if (isToday(due)) return 'due_today';

  return 'available';
}

/**
 * Generate scheduled tasks from program elements for a client
 */
export function generateScheduledTasks(programElements, clientProgram) {
  return programElements
    .filter(element => {
      // Only include client tasks (default) or tasks not assigned to coach
      if (element.type === 'task') {
        const taskData = element.data;
        return !taskData.assignedTo || taskData.assignedTo === 'client';
      }
      return true;
    })
    .map(element => {
      const scheduledDate = calculateElementDate(clientProgram.startDate, element.scheduledDay);

      let dueDate = scheduledDate;
      let estimatedTime;

      // Calculate due date and estimated time based on element type
      if (element.type === 'task' && 'dueInDays' in element.data) {
        dueDate = calculateDueDate(scheduledDate, element.data.dueInDays);
      }

      if (element.type === 'content' && 'fileType' in element.data) {
        estimatedTime = getEstimatedTimeForContent(element.data.fileType);
      }

      const isCompleted = clientProgram.progress.completedElements.includes(element.id);
      const status = getTaskStatus(scheduledDate, dueDate, isCompleted);

      return {
        id: `${clientProgram.id}_${element.id}`,
        programElementId: element.id,
        clientProgramId: clientProgram.id,
        title: element.title,
        description: element.description,
        type: element.type,
        scheduledDate,
        dueDate,
        status,
        isCompleted,
        category: getElementCategory(element),
        estimatedTime
      };
    });
}

/**
 * Filter tasks based on visibility rules
 */
export function getVisibleTasks(tasks, currentDate = new Date()) {
  const today = startOfDay(currentDate);

  return tasks.filter(task => {
    const scheduled = startOfDay(task.scheduledDate);

    // Show completed tasks
    if (task.isCompleted) return true;

    // Show tasks that are scheduled for today or earlier
    return !isAfter(scheduled, today);
  });
}

/**
 * Filter tasks by status
 */
export function filterTasksByStatus(tasks, status) {
  if (status === 'all') return tasks;
  return tasks.filter(task => task.status === status);
}

/**
 * Get tasks due today
 */
export function getTasksDueToday(tasks, currentDate = new Date()) {
  return tasks.filter(task => isToday(task.dueDate));
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(tasks, currentDate = new Date()) {
  return tasks.filter(task => task.status === 'overdue');
}

/**
 * Calculate progress for a client program based on tasks
 */
export function calculateProgramProgress(tasks) {
  const visibleTasks = getVisibleTasks(tasks);
  const completedTasks = visibleTasks.filter(task => task.isCompleted).length;
  const availableTasks = visibleTasks.length;

  return {
    totalTasks: tasks.length,
    completedTasks,
    availableTasks,
    completionRate: availableTasks > 0 ? (completedTasks / availableTasks) * 100 : 0
  };
}

/**
 * Helper function to get estimated time for content types
 */
function getEstimatedTimeForContent(fileType) {
  const timeMap = {
    'video': '10-15 minutes',
    'audio': '5-10 minutes',
    'article': '5-8 minutes',
    'template': '15-20 minutes',
    'image': '2-3 minutes',
    'program': '30-45 minutes'
  };

  return timeMap[fileType] || '5 minutes';
}

/**
 * Helper function to get category for program elements
 */
function getElementCategory(element) {
  if (element.type === 'content' && 'category' in element.data) {
    return element.data.category;
  }

  const categoryMap = {
    'task': 'Exercise',
    'message': 'Communication',
    'checkin': 'Assessment',
    'content': 'Learning'
  };

  return categoryMap[element.type] || 'General';
}

/**
 * Format due date for display
 */
export function formatTaskDueDate(dueDate, currentDate = new Date()) {
  if (isToday(dueDate)) return 'Today';

  const daysDiff = differenceInDays(dueDate, currentDate);

  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff === -1) return 'Yesterday';
  if (daysDiff < 0) return `${Math.abs(daysDiff)} days ago`;
  if (daysDiff <= 7) return `In ${daysDiff} days`;

  return format(dueDate, 'MMM d');
}

/**
 * Get status badge props for UI
 */
export function getTaskStatusBadge(status) {
  const statusMap = {
    'upcoming': { variant: 'outline', label: 'Upcoming' },
    'available': { variant: 'default', label: 'Available' },
    'due_today': { variant: 'secondary', label: 'Due Today' },
    'overdue': { variant: 'destructive', label: 'Overdue' },
    'completed': { variant: 'outline', label: 'Completed' }
  };

  return statusMap[status];
}