"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { ArrowLeft, CheckCircle, Circle, Clock, Target, Calendar, AlertTriangle, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TaskCelebration } from "@/app/components/TaskCelebration";
import { StreakCounter } from "@/app/components/StreakCounter";
import { toast } from "sonner";
import { useTranslation } from "@/app/context/LanguageContext";

// Real useClientTasks hook with API calls
const useClientTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Tasks API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
      setTasks([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);
  
  const visibleTasks = tasks;
  
  const filterTasks = (status) => {
    switch (status) {
      case "completed":
        return tasks.filter(task => task.isCompleted);
      case "overdue":
        return tasks.filter(task => !task.isCompleted && new Date(task.dueDate) < new Date());
      default:
        return tasks.filter(task => !task.isCompleted);
    }
  };
  
  const toggleTaskCompletion = async (taskId, onComplete) => {
    try {
      // Optimistically update the UI first
      const task = tasks.find(t => t.id === taskId);
      if (!task) return false;
      
      const newCompletedState = !task.isCompleted;
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, isCompleted: newCompletedState } : task
      ));
      
      // Call the API to update the database
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId,
          isCompleted: newCompletedState
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task completion');
      }

      const result = await response.json();
      
        // Create activity for task completion
        if (newCompletedState) {
          try {
            const activityResponse = await fetch('/api/activities/task-completed', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                taskData: {
                  id: taskId,
                  title: task.title,
                  description: task.description,
                  points: 5 // Default points for task completion
                }
              }),
            });
            
            if (activityResponse.ok) {
              console.log('✅ Task completion activity created');
            } else {
              console.error('❌ Failed to create task completion activity');
            }
          } catch (activityError) {
            console.error('❌ Error creating task completion activity:', activityError);
          }

          // Notification is handled by the server-side PUT endpoint
          // No need to create it here
        }
      
      // Call the completion callback if provided
      if (onComplete && newCompletedState) {
        await onComplete();
      }
      
      return true;
    } catch (error) {
      console.error('Error toggling task completion:', error);
      toast.error(error.message || t('tasks.updateFailed', 'Failed to update task completion'));
      
      // Revert the optimistic update
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
      ));
      
      return false;
    }
  };
  
  const taskStats = {
    completedTasks: tasks.filter(task => task.isCompleted).length,
    availableTasks: tasks.filter(task => !task.isCompleted).length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(task => task.isCompleted).length / tasks.length) * 100) : 0,
    pendingCount: tasks.filter(task => !task.isCompleted && new Date(task.dueDate) >= new Date()).length,
    overdueCount: tasks.filter(task => !task.isCompleted && new Date(task.dueDate) < new Date()).length
  };
  
  return { 
    visibleTasks, 
    filterTasks, 
    taskStats, 
    toggleTaskCompletion, 
    isLoading, 
    error, 
    refetch: fetchTasks 
  };
};

// Simple analytics hook for gamification (matching Dashboard implementation)
const useAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/analytics?period=today');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analyticsData,
    loading,
    error,
    refetch: fetchAnalytics
  };
};

// Mock utility functions
// formatTaskDueDate will be updated inline where it's used

const getTaskStatusBadge = (task, t) => {
  if (task.isCompleted) return { variant: "default", text: t('tasks.status.completed', "Completed") };
  if (new Date(task.dueDate) < new Date()) return { variant: "destructive", text: t('tasks.status.overdue', "Overdue") };
  if (task.priority === "high") return { variant: "secondary", text: t('tasks.status.highPriority', "High Priority") };
  return { variant: "outline", text: t('tasks.status.active', "Active") };
};

export default function ClientTasks() {
  const router = useRouter();
  const t = useTranslation();
  const [filter, setFilter] = useState("open");
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  
  const { visibleTasks, filterTasks, taskStats, toggleTaskCompletion, isLoading, error } = useClientTasks();
  
  // Gamification system (matching Dashboard implementation)
  const { analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useAnalytics();
  
  // Memoize gamification calculations (same as Dashboard)
  const gamification = useMemo(() => {
    if (!analyticsData) return { streak: 0, totalPoints: 0, level: 1, pointsToNextLevel: 100 };
    
    const totalPoints = analyticsData.totalEngagementPoints || 0;
    const level = Math.floor(totalPoints / 100) + 1;
    const pointsToNextLevel = (level * 100) - totalPoints;
    
    return {
      streak: analyticsData.dailyStreak || 0,
      totalPoints,
      level,
      pointsToNextLevel
    };
  }, [analyticsData]);
  
  // Motivational quotes
  const motivationalQuotes = [
    t('tasks.quotes.progress', "Progress, not perfection. 💪"),
    t('tasks.quotes.oneStep', "One step at a time. 🌱"), 
    t('tasks.quotes.youGotThis', "You've got this! ✨"),
    t('tasks.quotes.resilience', "Building resilience daily. 🌟"),
    t('tasks.quotes.stronger', "Growing stronger every day. 🚀")
  ];
  const todayQuote = motivationalQuotes[new Date().getDay() % motivationalQuotes.length];
  

  const handleTaskToggle = async (taskId) => {
    const success = await toggleTaskCompletion(taskId, async () => {
      // Refresh analytics data after task completion
      await refetchAnalytics();
      setShowCelebration(true);
    });
  };

  const toggleTaskExpansion = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const filteredTasks = (() => {
    switch (filter) {
      case "completed":
        return filterTasks("completed");
      case "overdue":
        return filterTasks("overdue");
      case "open":
      default:
        return visibleTasks.filter(task => !task.isCompleted);
    }
  })();

  const { completedTasks, availableTasks, completionRate } = taskStats;

  return (
    <div className="min-h-screen bg-background pb-20 safe-x" style={{ 
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
    }}>
      {/* Loading State */}
      {isLoading && (
        <div className="p-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('tasks.loading', 'Loading tasks...')}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('tasks.errorLoading', 'Error loading tasks')}</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  {t('common.buttons.tryAgain', 'Try Again')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - only show when not loading and no error */}
      {!isLoading && !error && (
        <>
          {/* Enhanced Header with Gamification */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
                      <Button variant="ghost" size="icon" onClick={() => router.push('/client')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">{t('tasks.myTasks', 'My Tasks')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{todayQuote}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Simplified Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="open" className="text-sm px-3">
              {t('tasks.open', 'Open')}
              {taskStats.pendingCount > 0 && (
                <span className="ml-1 text-xs opacity-70">({taskStats.pendingCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-sm px-3">
              {t('tasks.overdue', 'Overdue')}
              {taskStats.overdueCount > 0 && (
                <span className="ml-1 text-xs opacity-70">({taskStats.overdueCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-sm px-3">
              {t('tasks.completed', 'Completed')}
              {completedTasks > 0 && (
                <span className="ml-1 text-xs opacity-70">({completedTasks})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tasks List - Mobile Optimized with Expansion */}
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const statusBadge = getTaskStatusBadge(task, t);
            const isExpanded = expandedTasks.has(task.id);
            
            return (
              <Card key={task.id} className={`${task.isCompleted ? "bg-muted/50" : ""} transition-all duration-200`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpansion(task.id)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-4">
                      <Button
                        variant={task.isCompleted ? "default" : "outline"}
                        size="icon"
                        className="mt-1 h-8 w-8 p-0 min-h-[44px] min-w-[44px] rounded-full touch-manipulation"
                        onClick={() => handleTaskToggle(task.id)}
                      >
                        {task.isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className={`font-medium text-base ${
                            task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {((filter === 'open' && !task.isCompleted) || 
                              (filter === 'overdue' && !task.isCompleted && new Date(task.dueDate) < new Date()) || 
                              (filter === 'completed' && task.isCompleted)) && (
                              <Badge variant={statusBadge.variant} className="text-xs">
                                {statusBadge.text}
                              </Badge>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        
                        <p className={`text-sm ${
                          task.isCompleted ? 'text-muted-foreground line-through' : 'text-muted-foreground'
                        }`}>
                          {task.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {(() => {
                              const date = new Date(task.dueDate);
                              const now = new Date();
                              const diffTime = date - now;
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              if (diffDays < 0) return t('tasks.status.overdue', "Overdue");
                              if (diffDays === 0) return t('common.time.today', "Today");
                              if (diffDays === 1) return t('common.time.tomorrow', "Tomorrow");
                              if (diffDays < 7) {
                                const translation = t('common.time.inDays', "In {count} days");
                                return translation.replace('{count}', diffDays);
                              }
                              return date.toLocaleDateString();
                            })()}
                          </div>
                          {task.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {task.estimatedTime}
                            </div>
                          )}
                        </div>
                        
                        <CollapsibleContent className="space-y-3">
                          <div className="pt-2 border-t border-border">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-foreground">{t('tasks.details', 'Task Details')}</p>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {task.category && (
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    <span>{t('tasks.category', 'Category')}: {task.category}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  <span>{t('tasks.type', 'Type')}: {task.category === 'daily' ? t('tasks.dailyActivity', 'Daily Activity') : t('tasks.weeklyGoal', 'Weekly Goal')}</span>
                                </div>
                              </div>
                              
                              
                              {/* Progress Note for Completed Tasks */}
                              {task.isCompleted && (
                                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                                  <p className="text-sm text-success font-medium">✓ {t('tasks.completedSuccess', 'Great job! Task completed successfully.')}</p>
                                  <p className="text-xs text-success/80 mt-1">{t('tasks.earnedXP', 'You earned +10 XP for this completion.')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('tasks.noTasks', 'No tasks found')}</h3>
                <p className="text-muted-foreground">
                  {filter === "completed" 
                    ? t('tasks.noCompleted', "You haven't completed any tasks yet.")
                    : filter === "overdue"
                    ? t('tasks.noOverdue', "No overdue tasks - you're up to date!")
                    : t('tasks.noOpen', "No open tasks to show.")
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak Counter */}
        <StreakCounter
          streak={gamification.streak}
          totalPoints={gamification.totalPoints}
          level={gamification.level}
          pointsToNextLevel={gamification.pointsToNextLevel}
        />
      </div>
      
        </>
      )}
      
      <TaskCelebration 
        isVisible={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />
    </div>
  );
}