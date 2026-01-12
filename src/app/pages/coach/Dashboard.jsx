"use client"
  
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { PageHeader } from "@/app/components/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/app/context/LanguageContext";
import { toast } from "sonner";
import { 
  Users, 
  TrendingUp, 
  CheckCircle,
  BarChart3,
  Loader2
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";


const earningsData = [
  { month: "Jul", value: 45000 },
  { month: "Aug", value: 58000 },
  { month: "Sep", value: 52000 },
  { month: "Oct", value: 75000 },
  { month: "Nov", value: 88000 },
  { month: "Dec", value: 125000 },
  { month: "Jan", value: 148000 },
  { month: "Feb", value: 165000 },
  { month: "Mar", value: 220000 },
  { month: "Apr", value: 285000 },
  { month: "May", value: 350000 }
];

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskUpdating, setTaskUpdating] = useState(null);
  const [clientStats, setClientStats] = useState({
    activeClients: 0,
    newClientsThisMonth: 0,
    churnedClientsThisMonth: 0,
    totalClients: 0
  });
  
  console.log("clientStas", clientStats)
  const [clientStatsLoading, setClientStatsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640); // sm breakpoint
      setIsTablet(width >= 640 && width < 1024); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);


  // Fetch activities
  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true);
      const response = await fetch(`/api/activities?coachId=${session?.user?.id}&limit=5`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Fetch today's tasks when component mounts
  useEffect(() => {
    const fetchTodayTasks = async () => {
      setTasksLoading(true);
      try {
        const response = await fetch('/api/coach/tasks/today');
        
        if (!response.ok) {
          throw new Error('Failed to fetch today\'s tasks');
        }
        
        const data = await response.json();
        setTasks(data.tasks || []);
      } catch (error) {
        console.error('Error fetching today\'s tasks:', error);
        toast.error(t('dashboard.coach.todaysTasks'));
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTodayTasks();
    if (session?.user?.id) {
      fetchActivities();
    }
  }, [session?.user?.id]);

  // Fetch client statistics when component mounts
  useEffect(() => {
    const fetchClientStats = async () => {
      setClientStatsLoading(true);
      try {
        const response = await fetch('/api/coach/clients/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch client statistics');
        }
        
        const data = await response.json();
        setClientStats({
          activeClients: data.activeClients || 0,
          newClientsThisMonth: data.newClientsThisMonth || 0,
          churnedClientsThisMonth: data.churnedClientsThisMonth || 0,
          totalClients: data.totalClients || 0
        });
      } catch (error) {
        console.error('Error fetching client statistics:', error);
        toast.error(t('common.messages.error'));
        setClientStats({
          activeClients: 0,
          newClientsThisMonth: 0,
          churnedClientsThisMonth: 0,
          totalClients: 0
        });
      } finally {
        setClientStatsLoading(false);
      }
    };

    fetchClientStats();
  }, []);

  const handleViewAllTasks = () => {
    router.push('/coach/tasks');
  };

  const handleTaskCompletion = async (taskId, taskText, completed) => {
    setTaskUpdating(taskId);
    try {
      const response = await fetch('/api/coach/tasks/today', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          completed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      const result = await response.json();
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, completed, status: completed ? 'completed' : 'pending' }
            : task
        )
      );
      
      toast.success(result.message);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error.message || "Failed to update task");
    } finally {
      setTaskUpdating(null);
    }
  };

  return (
    <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''}`}>
      {/* Page Header */}
      <PageHeader 
        title={t('dashboard.coach.title')} 
        subtitle={t('dashboard.coach.overview')} 
      />

      {/* First Row - My Tasks and Client Overview */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* My Tasks */}
        <Card className={`card-standard ${isMobile ? 'p-3' : ''}`}>
          <CardHeader className={`pb-4 ${isMobile ? 'pb-3 px-0' : ''}`}>
            <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
              <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
              {t('tasks.myTasks')}
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 ${isMobile ? 'space-y-2 px-0' : ''}`}>
            {tasksLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">{t('common.messages.loading')}</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center p-4">
                <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('dashboard.coach.noTasks')}</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className={`flex items-center ${isMobile ? 'space-x-2 p-2' : 'space-x-3 p-3'} rounded-lg bg-muted/50 hover:bg-muted transition-colors`}>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'} flex-1 cursor-pointer`}>
                        <Checkbox 
                          id={`task-${task.id}`} 
                          checked={task.completed}
                          disabled={taskUpdating === task.id}
                          className={isMobile ? 'h-4 w-4' : ''}
                        />
                        <label 
                          htmlFor={`task-${task.id}`} 
                          className={`${isMobile ? 'text-xs' : 'text-sm'} flex-1 cursor-pointer ${
                            task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {task.text}
                        </label>
                        {taskUpdating === task.id && (
                          <Loader2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} animate-spin text-muted-foreground`} />
                        )}
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent className={isMobile ? 'mx-4' : ''}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {task.completed ? t('tasks.markIncomplete') : t('tasks.markComplete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {task.completed 
                            ? `${t('common.messages.confirmDelete')} "${task.text}"?`
                            : `${t('common.messages.confirmDelete')} "${task.text}"?`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleTaskCompletion(task.id, task.text, !task.completed)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {task.completed ? t('tasks.markIncomplete') : t('tasks.markComplete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
            <div className={`pt-2 ${isMobile ? 'pt-1' : ''}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className="text-foreground">• {t('dashboard.coach.todaysTasks')}</span>
                <Badge variant="secondary" className={`bg-primary text-primary-foreground ${isMobile ? 'text-xs px-1.5 py-0' : ''}`}>
                  {tasksLoading ? "..." : tasks.length}
                </Badge>
              </div>
              <div className={`flex items-center justify-between ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                <span className="text-foreground">• {t('common.status.completed')}</span>
                <Badge variant="secondary" className={`bg-green-500 text-white ${isMobile ? 'text-xs px-1.5 py-0' : ''}`}>
                  {tasksLoading ? "..." : tasks.filter(task => task.completed).length}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                className={`w-full ${isMobile ? 'mt-2 h-9 text-sm' : 'mt-4'} border-primary text-primary hover:bg-primary hover:text-primary-foreground`}
                onClick={handleViewAllTasks}
                size={isMobile ? "sm" : "default"}
              >
                {t('dashboard.coach.viewAllTasks')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client Overview */}
        <Card className={`card-standard ${isMobile ? 'p-3' : ''}`}>
          <CardHeader className={`pb-4 ${isMobile ? 'pb-3 px-0' : ''}`}>
            <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
              <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-secondary`} />
              {t('dashboard.coach.stats.totalClients')}
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-4 ${isMobile ? 'space-y-2 px-0' : ''}`}>
            {clientStatsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">{t('common.messages.loading')}</span>
              </div>
            ) : (
              <>
                <div className={`flex justify-between items-center ${isMobile ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
                  <span className={`text-foreground font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{t('dashboard.coach.stats.activeClients')}</span>
                  <Badge className={`bg-primary text-primary-foreground ${isMobile ? 'text-sm px-2 py-0.5' : 'text-lg px-3 py-1'}`}>
                    {clientStats.activeClients}
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isMobile ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
                  <span className={`text-foreground font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{t('dashboard.coach.stats.newThisMonth')}</span>
                  <Badge className={`bg-accent text-accent-foreground ${isMobile ? 'text-sm px-2 py-0.5' : 'text-lg px-3 py-1'}`}>
                    {clientStats.newClientsThisMonth}
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isMobile ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
                  <span className={`text-foreground font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{t('dashboard.coach.stats.churnedThisMonth')}</span>
                  <Badge className={`bg-secondary text-secondary-foreground ${isMobile ? 'text-sm px-2 py-0.5' : 'text-lg px-3 py-1'}`}>
                    {clientStats.churnedClientsThisMonth}
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isMobile ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
                  <span className={`text-foreground font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{t('dashboard.coach.stats.totalClients')}</span>
                  <Badge className={`bg-muted text-muted-foreground ${isMobile ? 'text-sm px-2 py-0.5' : 'text-lg px-3 py-1'}`}>
                    {clientStats.totalClients}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Second Row - Earnings Overview and Latest Activity */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Earnings Overview */}
        <Card className={`card-standard ${isMobile ? 'p-3' : ''}`}>
          <CardHeader className={isMobile ? 'px-0 pb-3' : ''}>
            <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
              <BarChart3 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-accent`} />
              {t('dashboard.coach.earnings')}
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'px-0' : ''}>
            <div className={isMobile ? 'h-48' : 'h-64'}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-medium)'
                    }}
                    formatter={(value) => [`${(value / 1000).toFixed(0)}k`, 'Earnings']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill="url(#colorGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Latest Activity */}
        <Card className={`card-standard ${isMobile ? 'p-3' : ''}`}>
          <CardHeader className={`pb-4 ${isMobile ? 'pb-3 px-0' : ''}`}>
            <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
              <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-teal`} />
                {t('dashboard.coach.recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'px-0' : ''}>
            {activitiesLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">{t('common.messages.loading')}</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('common.messages.noData')}</p>
                <p className="text-sm">{t('dashboard.coach.recentActivity')}</p>
              </div>
            ) : (
              <ScrollArea className={`${isMobile ? 'h-[300px]' : 'h-[400px]'}`}>
                <div className={`space-y-4 ${isMobile ? 'space-y-2 pr-2' : 'pr-4'}`}>
                  {activities.map((activity) => (
                    <div key={activity.id} className={`flex items-start ${isMobile ? 'space-x-2 p-2' : 'space-x-3 p-3'} rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors`}>
                      <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-full bg-primary/10 text-primary`}>
                        {activity.type === 'signup' && <Users className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
                        {activity.type === 'task_completed' && <CheckCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
                        {activity.type === 'daily_checkin' && <TrendingUp className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
                        {activity.type === 'session_attended' && <BarChart3 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
                        {!['signup', 'task_completed', 'daily_checkin', 'session_attended'].includes(activity.type) && <TrendingUp className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground truncate`}>
                            {activity.title}
                          </h4>
                          {activity.pointsEarned > 0 && (
                            <Badge variant="secondary" className={`${isMobile ? 'ml-1 text-xs px-1 py-0' : 'ml-2'}`}>
                              +{activity.pointsEarned} pts
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1 line-clamp-2`}>
                            {activity.description}
                          </p>
                        )}
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                          {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}