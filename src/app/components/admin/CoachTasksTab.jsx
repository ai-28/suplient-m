"use client"

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plus, ClipboardList, Loader2, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { CreateCoachTaskDialog } from "./CreateCoachTaskDialog";

export function CoachTasksTab({ coachId, coachName }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [coachId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/coaches/${coachId}/tasks`);
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        toast.error('Failed to load tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error loading tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (task) => {
    setTasks(prev => [task, ...prev]);
    setShowCreateDialog(false);
    toast.success('Task created successfully');
  };

  const getTaskStatus = (task) => {
    if (task.status === 'completed') {
      return { label: 'Completed', variant: 'default', icon: CheckCircle };
    }
    
    if (!task.dueDate) {
      return { label: 'No due date', variant: 'secondary', icon: Clock };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return { label: 'Overdue', variant: 'destructive', icon: AlertTriangle };
    }
    if (dueDate.toDateString() === today.toDateString()) {
      return { label: 'Due Today', variant: 'default', icon: Calendar };
    }
    return { label: 'Upcoming', variant: 'secondary', icon: Clock };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date < today) return `${Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => {
      const status = getTaskStatus(t);
      return status.label === 'Overdue';
    }).length,
    pending: tasks.filter(t => t.status !== 'completed').length
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Tasks for {coachName}</h3>
          <p className="text-sm text-muted-foreground">
            Manage tasks assigned to this coach
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tasks assigned yet</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Assign First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const status = getTaskStatus(task);
            const StatusIcon = status.icon;
            
            return (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge variant={status.variant} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                        {task.assignedByName && (
                          <span>Assigned by {task.assignedByName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateCoachTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        coachId={coachId}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
