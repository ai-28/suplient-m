"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { useNotifications } from '@/app/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { MessageWithLinks } from './MessageWithLinks';

const notificationIcons = {
  client_signup: '👤',
  task_completed: '✅',
  daily_checkin: '📝',
  new_message: '💬',
  resource_shared: '📁',
  session_reminder: '⏰',
  goal_achieved: '🎯',
  system: '⚙️',
  group_join_request: '👥',
  other: '🔔'
};

// const notificationColors = {
//   low: 'text-gray-600 dark:text-gray-400',
//   normal: 'text-blue-600 dark:text-blue-400',
//   high: 'text-orange-600 dark:text-orange-400',
//   urgent: 'text-red-600 dark:text-red-400'
// };

export function NotificationBell({ userRole = 'client' }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { 
    notifications, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications({ limit: 50 }); // Fetch all notifications (read and unread)

  // Check notification preference on mount
  useEffect(() => {
    const checkPreference = async () => {
      try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        if (data.success && data.user?.notificationsEnabled !== undefined) {
          setNotificationsEnabled(data.user.notificationsEnabled !== false);
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem('notificationsEnabled');
          setNotificationsEnabled(saved !== 'false');
        }
      } catch (error) {
        // Fallback to localStorage
        const saved = localStorage.getItem('notificationsEnabled');
        setNotificationsEnabled(saved !== 'false');
      }
    };
    checkPreference();
  }, []);

  // If notifications are disabled, return empty bell
  if (!notificationsEnabled) {
    return (
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  // Filter notifications based on user role (show both read and unread)
  const filteredNotifications = notifications.filter(notification => {
    if (userRole === 'admin') {
      // Admins see all their notifications
      return true;
    } else if (userRole === 'coach') {
      // Coaches see: client signup, task completion, daily checkin, new messages from THEIR OWN CLIENTS, system notifications, and group join requests
      const allowedTypes = ['client_signup', 'task_completed', 'daily_checkin', 'new_message', 'system', 'group_join_request'];
      if (!allowedTypes.includes(notification.type)) return false;
      
      // For client-related notifications, check if the client belongs to this coach
      if (notification.data?.clientId) {
        // This will be handled by the backend - only notifications for this coach's clients should be sent
        return true;
      }
      
      // For new messages, check if it's from a client of this coach
      if (notification.type === 'new_message' && notification.data?.senderId) {
        // This will be handled by the backend - only messages from clients should be sent to coach
        return true;
      }
      
      return true;
    } else if (userRole === 'client') {
      // Clients see: new messages from THEIR COACH, shared resources from THEIR COACH, session reminders, etc.
      const allowedTypes = ['new_message', 'resource_shared', 'session_reminder', 'goal_achieved', 'system'];
      if (!allowedTypes.includes(notification.type)) return false;
      
      // For new messages, check if it's from their coach
      if (notification.type === 'new_message' && notification.data?.senderId) {
        // This will be handled by the backend - only messages from their coach should be sent
        return true;
      }
      
      // For resource sharing, check if it's from their coach
      if (notification.type === 'resource_shared' && notification.data?.coachId) {
        // This will be handled by the backend - only resources from their coach should be sent
        return true;
      }
      
      return true;
    }
    return true; // Default: show all notifications
  });

  // Calculate unread count from filtered notifications
  const filteredUnreadCount = filteredNotifications.filter(n => !n.isRead).length;

  // Navigation mapping function - determines where to navigate based on notification type and role
  const getNotificationRoute = (notification) => {
    // Parse data if it's a string (sometimes data comes as JSON string from database)
    let data = notification.data || {};
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.warn('Failed to parse notification data as JSON:', e);
        data = {};
      }
    }
    const notificationType = data.notificationType || notification.type;

    if (userRole === 'client') {
      switch (notificationType) {
        case 'new_message':
          // Navigate to chat/sessions page
          return '/client/sessions';
        
        case 'resource_shared':
          // Navigate to resources page
          return '/client/resources';
        
        case 'session_reminder':
          // Navigate to sessions page
          return '/client/sessions';
        
        case 'goal_achieved':
          // Navigate to dashboard
          return '/client/dashboard';
        
        case 'task_created':
          // Navigate to tasks/action page
          return '/client/tasks';
        
        case 'system':
          // Check the notificationType in data to determine specific navigation
          if (data.notificationType === 'resource_shared') {
            return '/client/resources';
          }
          if (data.notificationType === 'task_created') {
            // Navigate to tasks/action page
            return '/client/tasks';
          }
          // Default to dashboard for system notifications
          return '/client/dashboard';
        
        default:
          return '/client/dashboard';
      }
    } else if (userRole === 'coach') {
      switch (notification.type) {
        case 'client_signup':
          // Navigate to client profile if clientId exists
          if (data.clientId) {
            return `/coach/clients/${data.clientId}`;
          }
          // Otherwise go to clients list
          return '/coach/clients';
        
        case 'task_completed':

          return '/coach/tasks';
        
        case 'daily_checkin':
          // Navigate to client profile with overview tab
          if (data.clientId) {
            return `/coach/clients/${data.clientId}?tab=overview`;
          }
          return '/coach/clients';
        
        case 'new_message':
          // Navigate to client profile (chat is in the center column)
          if (data.clientId) {
            return `/coach/clients/${data.clientId}`;
          }
          // If conversationId exists, use it to get clientId (preferred method)
          if (data.conversationId) {
            return `FETCH_CLIENT_FROM_CONV:${data.conversationId}`;
          }
          // If senderId exists, we need to fetch clientId from userId (fallback)
          if (data.senderId) {
            return `FETCH_CLIENT_FROM_USER:${data.senderId}`;
          }
          return '/coach/clients';
        
        case 'group_join_request':
          // Navigate to group detail page
          if (data.groupId) {
            return `/coach/group/${data.groupId}`;
          }
          return '/coach/groups';
        
        case 'goal_achieved':
          // Navigate to client profile with progress tab
          if (data.clientId) {
            return `/coach/clients/${data.clientId}?tab=progress`;
          }
          return '/coach/clients';
        
        case 'system':
          // Check the notificationType in data to determine specific navigation
          if (data.notificationType === 'admin_task_assigned') {
            // Navigate to tasks page
            return '/coach/tasks';
          }
          if (data.notificationType === 'group_join_request') {
            // Navigate to groups page
            if (data.groupId) {
              return `/coach/group/${data.groupId}`;
            }
            return '/coach/groups';
          }
          // Default to dashboard
          return '/coach/dashboard';
        
        default:
          return '/coach/dashboard';
      }
    } else if (userRole === 'admin') {
      switch (notification.type) {
        case 'client_signup':
          // Navigate to clients page
          return '/admin/clients';
        
        case 'system':
          // Check the notificationType in data to determine specific navigation
          if (data.notificationType === 'coach_task_completed') {
            // Navigate to the coach's tasks page
            if (data.coachId) {
              return `/admin/coaches/${data.coachId}?tab=tasks`;
            }
            return '/admin/coaches';
          }
          // Admin notifications - could go to dashboard or relevant page
          if (data.coachId) {
            return `/admin/coaches/${data.coachId}`;
          }
          if (data.clientId) {
            return '/admin/clients';
          }
          return '/admin/dashboard';
        
        default:
          return '/admin/dashboard';
      }
    }

    return null; // No navigation
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if it's unread
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Close the notification popover
    setIsOpen(false);
    
    // Get the route for this notification
    let route = getNotificationRoute(notification);
    
    // Handle special case: need to fetch clientId for coach message notifications
    if (route && route.startsWith('FETCH_CLIENT_FROM_CONV:')) {
      const conversationId = route.replace('FETCH_CLIENT_FROM_CONV:', '');
      try {
        // Fetch clientId from conversationId (preferred method)
        const response = await fetch(`/api/chat/conversations/${conversationId}/client`);
        
        if (!response.ok) {
          route = '/coach/clients';
        } else {
          const data = await response.json();
          
          if (data.success && data.clientId) {
            route = `/coach/clients/${data.clientId}`;
          } else {
            route = '/coach/clients';
          }
        }
      } catch (error) {
        // Fallback to clients list on error
        route = '/coach/clients';
      }
    } else if (route && route.startsWith('FETCH_CLIENT_FROM_USER:')) {
      const senderId = route.replace('FETCH_CLIENT_FROM_USER:', '');
      try {
        // Fetch clientId from senderId (userId) - fallback method
        const response = await fetch(`/api/clients/by-user/${senderId}`);
        
        if (!response.ok) {
          route = '/coach/clients';
        } else {
          const data = await response.json();
          
          if (data.success && data.client?.id) {
            route = `/coach/clients/${data.client.id}`;
          } else {
            route = '/coach/clients';
          }
        }
      } catch (error) {
        // Fallback to clients list on error
        route = '/coach/clients';
      }
    }
    
    if (route) {
      // Small delay to ensure popover closes smoothly, then navigate
      setTimeout(() => {
        router.push(route);
      }, 100);
    }
  };

  const handleClearAll = async () => {
    toast('Are you sure you want to clear all notifications?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Clear',
        onClick: async () => {
    await markAllAsRead();
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      duration: 5000,
    });
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {filteredUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {filteredUnreadCount > 99 ? '99+' : filteredUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-background dark:bg-background" align="end">
        <Card className="border-0 shadow-none bg-background dark:bg-background">
          <CardHeader className="pb-3 border-b border-border dark:border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground dark:text-foreground">
                Notifications {filteredUnreadCount > 0 && `(${filteredUnreadCount} unread)`}
              </CardTitle>
              {filteredNotifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearAll}
                  className="text-xs text-foreground dark:text-foreground hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive"
                >
                  Clear all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground dark:text-muted-foreground">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground dark:text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`group p-3 border-b border-border dark:border-border cursor-pointer transition-colors ${
                        !notification.isRead 
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/50 dark:hover:bg-blue-950/40 border-l-4 border-l-blue-500' 
                          : 'bg-background dark:bg-background hover:bg-muted/50 dark:hover:bg-muted/50 opacity-70'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-lg">
                          {notificationIcons[notification.type] || notificationIcons.other}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm truncate text-foreground dark:text-foreground ${
                              !notification.isRead ? 'font-semibold' : 'font-normal'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-1">

                              {!notification.isRead && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering parent click
                                    handleNotificationClick(notification);
                                  }}
                                  className="h-6 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 border-primary/20 hover:border-primary/40"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  read
                                </Button>
                              )}
                              {/* <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteNotification(e, notification.id)}
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity hover:bg-destructive/10 dark:hover:bg-destructive/20"
                              >
                                <X className="h-3 w-3 text-foreground dark:text-foreground" />
                              </Button> */}
                            </div>
                          </div>
                          <div className={`text-xs mt-1 line-clamp-2 ${
                            !notification.isRead 
                              ? 'text-foreground dark:text-foreground' 
                              : 'text-muted-foreground dark:text-muted-foreground'
                          }`}>
                            <MessageWithLinks messageText={notification.message} />
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
