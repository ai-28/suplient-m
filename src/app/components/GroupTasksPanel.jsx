"use client"
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { CreateTaskDialog } from "@/app/components/CreateTaskDialog";
import { TaskCompletionModal } from "@/app/components/TaskCompletionModal";
import { 
  Plus,
  Calendar,
  Users,
  Loader2
} from "lucide-react";

export function GroupTasksPanel({ groupId, memberCount }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Fetch group tasks
  const fetchGroupTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/groups/${groupId}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch group tasks');
      }
      
      const result = await response.json();
      setTasks(result.tasks || []);
    } catch (err) {
      console.error('Error fetching group tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks on component mount
  useEffect(() => {
    if (groupId) {
      fetchGroupTasks();
    }
  }, [groupId]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleTaskCreated = (taskData) => {
    // Refresh the tasks list to get the real data from the database
    fetchGroupTasks();
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  return (
    <>
      <Card className={`${isMobile ? 'p-0 shadow-none border-0' : 'shadow-soft border-border'} bg-card h-full flex flex-col`}>
        <CardHeader className={`${isMobile ? 'px-2 pb-2 pt-2' : 'pb-3'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`text-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Group Tasks</CardTitle>
            <CreateTaskDialog 
              mode="group" 
              groupId={groupId}
              memberCount={memberCount}
              onTaskCreated={handleTaskCreated}
            >
              <Button 
                size={isMobile ? "sm" : "sm"} 
                variant="ghost"
                className={isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}
              >
                <Plus className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              </Button>
            </CreateTaskDialog>
          </div>
        </CardHeader>
        <CardContent className={`flex-1 flex flex-col ${isMobile ? 'px-2 pb-2' : ''}`}>
          <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[250px]'}`}>
            {loading ? (
              <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
                <div className="text-center">
                  <Loader2 className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
                  <p className={`${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'} text-muted-foreground`}>Loading tasks...</p>
                </div>
              </div>
            ) : error ? (
              <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
                <div className="text-center">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-destructive ${isMobile ? 'mb-1' : 'mb-2'} break-words`}>Error: {error}</p>
                  <Button size={isMobile ? "sm" : "sm"} variant="outline" onClick={fetchGroupTasks} className={isMobile ? 'text-xs h-7 mt-1' : ''}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
                <div className="text-center">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>No tasks assigned yet</p>
                </div>
              </div>
            ) : (
              <div className={`${isMobile ? 'space-y-2 pr-2' : 'space-y-3 pr-4'}`}>
                {tasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className={`${isMobile ? 'p-2' : 'p-3'} bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer`}
                >
                  <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground font-medium break-words`}>{task.title}</h4>
                      </div>
                    </div>
                    
                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                      {task.description}
                    </p>
                    
                    <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : 'justify-between'} ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        <span className="text-muted-foreground break-words">{task.dueDate}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Users className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        <span className="text-muted-foreground break-words">
                          {task.completedCount}/{task.assignedCount}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all" 
                        style={{ width: `${(task.completedCount / task.assignedCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <TaskCompletionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={selectedTask}
      />
    </>
  );
}
