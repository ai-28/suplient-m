"use client"

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { MessageSquare, ClipboardList, FileText, AlertCircle, CheckCircle, Clock, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/app/components/PageHeader";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { useTranslation } from "@/app/context/LanguageContext";

export default function AdminCommunicationPage() {
  const router = useRouter();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminCommunication();
  }, []);

  const fetchAdminCommunication = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/coach/admin-communication');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        toast.error(t('adminCommunication.errors.loadFailed', 'Failed to load admin communication'));
      }
    } catch (error) {
      console.error('Error fetching admin communication:', error);
      toast.error(t('adminCommunication.errors.loadError', 'Error loading admin communication'));
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('adminCommunication.yesterday', 'Yesterday');
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return t('adminCommunication.noDueDate', 'No due date');
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date.toDateString() === today.toDateString()) return t('adminCommunication.today', 'Today');
    if (date < today) {
      const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const daysAgoText = t('adminCommunication.daysAgo', '{days} days ago');
      return daysAgoText.replace('{days}', daysAgo.toString());
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTaskStatus = (task) => {
    if (task.status === 'completed') {
      return { label: t('adminCommunication.taskStatus.completed', 'Completed'), variant: 'default', icon: CheckCircle };
    }
    
    if (!task.dueDate) {
      return { label: t('adminCommunication.taskStatus.noDueDate', 'No due date'), variant: 'secondary', icon: Clock };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return { label: t('adminCommunication.taskStatus.overdue', 'Overdue'), variant: 'destructive', icon: AlertCircle };
    }
    if (dueDate.toDateString() === today.toDateString()) {
      return { label: t('adminCommunication.taskStatus.dueToday', 'Due Today'), variant: 'default', icon: Calendar };
    }
    return { label: t('adminCommunication.taskStatus.upcoming', 'Upcoming'), variant: 'secondary', icon: Clock };
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('adminCommunication.noData', 'No admin communication data available')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title={t('adminCommunication.title', 'Admin Communication')} 
        subtitle={t('adminCommunication.subtitle', 'Messages, tasks, and notes from administrators')}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('adminCommunication.stats.unreadMessages', 'Unread Messages')}</p>
                <p className="text-2xl font-bold">{data.stats.unreadMessages || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('adminCommunication.stats.pendingTasks', 'Pending Tasks')}</p>
                <p className="text-2xl font-bold">{data.stats.pendingTasks || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('adminCommunication.stats.overdueTasks', 'Overdue Tasks')}</p>
                <p className="text-2xl font-bold text-red-600">{data.stats.overdueTasks || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('adminCommunication.stats.totalTasks', 'Total Tasks')}</p>
                <p className="text-2xl font-bold">{data.stats.totalTasks || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('adminCommunication.tabs.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            {t('adminCommunication.tabs.messages', 'Messages')} {data.stats.unreadMessages > 0 && (
              <Badge variant="destructive" className="ml-2">{data.stats.unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-2" />
            {t('adminCommunication.tabs.notes', 'Notes')} {data.stats.totalNotes > 0 && (
              <Badge variant="default" className="ml-2">{data.stats.totalNotes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-4 w-4 mr-2" />
            {t('adminCommunication.tabs.tasks', 'Tasks')} {data.stats.pendingTasks > 0 && (
              <Badge variant="default" className="ml-2">{data.stats.pendingTasks}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('adminCommunication.recentMessages', 'Recent Messages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.conversations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t('adminCommunication.noMessages', 'No messages from admin yet')}</p>
              ) : (
                <div className="space-y-3">
                  {data.conversations.slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        router.push(`/coach/admin-communication/${conv.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {conv.adminName?.charAt(0)?.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conv.adminName || 'Admin'}</p>
                          {conv.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive">{conv.unreadCount}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(conv.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('adminCommunication.recentNotes', 'Recent Notes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.notes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t('adminCommunication.noNotes', 'No notes from admin yet')}</p>
              ) : (
                <div className="space-y-3">
                  {data.notes.slice(0, 5).map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setActiveTab('notes');
                      }}
                    >
                      <h4 className="font-medium mb-1">{note.title}</h4>
                      {note.description && (
                        <p className="text-sm text-muted-foreground truncate mb-1">{note.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {note.createdByName && t('adminCommunication.createdBy', 'Created by {name}').replace('{name}', note.createdByName)} • {formatTimestamp(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {t('adminCommunication.recentTasks', 'Recent Tasks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t('adminCommunication.noTasks', 'No tasks assigned by admin yet')}</p>
              ) : (
                <div className="space-y-3">
                  {data.tasks.slice(0, 5).map((task) => {
                    const status = getTaskStatus(task);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          router.push('/coach/tasks');
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h4>
                            <Badge variant={status.variant} className="text-xs">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{t('adminCommunication.assignedBy', 'Assigned by {name}').replace('{name}', task.assignedByName)}</span>
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminCommunication.adminMessages', 'Admin Messages')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('adminCommunication.noMessages', 'No messages from admin yet')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        router.push(`/coach/admin-communication/${conv.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {conv.adminName?.charAt(0)?.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{conv.adminName || 'Admin'}</p>
                            {conv.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {t('adminCommunication.new', '{count} new').replace('{count}', conv.unreadCount.toString())}
                              </Badge>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {conv.lastMessage.content}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(conv.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminCommunication.adminNotes', 'Admin Notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.notes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('adminCommunication.noNotes', 'No notes from admin yet')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.notes.map((note) => (
                    <Card key={note.id} className="border">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-base mb-1">{note.title}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {note.createdByName && t('adminCommunication.createdBy', 'Created by {name}').replace('{name}', note.createdByName)} • {formatTimestamp(note.createdAt)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      {note.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {note.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminCommunication.adminAssignedTasks', 'Admin-Assigned Tasks')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.tasks.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('adminCommunication.noTasks', 'No tasks assigned by admin yet')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.tasks.map((task) => {
                    const status = getTaskStatus(task);
                    const StatusIcon = status.icon;
                    
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          router.push('/coach/tasks');
                        }}
                      >
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
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate)}
                            </span>
                            <span>{t('adminCommunication.assignedBy', 'Assigned by {name}').replace('{name}', task.assignedByName)}</span>
                            <span>{t('adminCommunication.created', 'Created {time}').replace('{time}', formatTimestamp(task.createdAt))}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
