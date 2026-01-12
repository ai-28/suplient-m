"use client"

import { useState, useEffect } from "react";
import { Bell, X, FileText, Share2, Download, Eye, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

export function NotificationSystem({ userRole, className = "" }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Mock notifications - in a real app, these would come from an API
  useEffect(() => {
    let mockNotifications = [];

    if (userRole === "coach") {
      // Coach notifications: admin messages, system updates, maintenance, membership requests
      mockNotifications = [
        {
          id: "1",
          type: "membership_request",
          title: "New Membership Request",
          message: "Emma Thompson requested to join Anxiety Support Group",
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          read: false,
          category: "requests",
          groupId: 3,
          requestId: "req_1"
        },
        {
          id: "2",
          type: "admin_message",
          title: "New Feature Available",
          message: "We've added new video analytics to help you track client engagement",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          read: false,
          category: "features"
        },
        {
          id: "3",
          type: "system",
          title: "Platform Update",
          message: "System will be updated tonight at 2 AM. No service interruption expected.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
          read: false,
          category: "system"
        },
        {
          id: "4",
          type: "admin_message",
          title: "Training Session Reminder",
          message: "Don't forget about tomorrow's training session on new library features",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          read: true,
          category: "training"
        }
      ];
    } else {
      // Client notifications: file sharing, resources from coach
      mockNotifications = [
        {
          id: "1",
          type: "file_shared",
          title: "New Resource Shared",
          message: "Dr. Sarah shared 'Introduction to Mindfulness' video with you",
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          read: false,
          fileId: "video-1",
          fileName: "Introduction to Mindfulness",
          sharedBy: "Dr. Sarah",
          category: "videos"
        },
        {
          id: "2",
          type: "file_shared",
          title: "Group Resource Available",
          message: "New article 'Managing Anxiety' shared with Anxiety Support Group",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          read: false,
          fileId: "article-2",
          fileName: "Managing Anxiety",
          sharedBy: "Dr. Sarah",
          category: "articles"
        },
        {
          id: "3",
          type: "file_shared",
          title: "Resource Updated",
          message: "Updated breathing exercise template is now available",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          read: true,
          fileId: "template-1",
          fileName: "Breathing Exercise Template",
          sharedBy: "Dr. Sarah",
          category: "templates"
        }
      ];
    }

    setNotifications(mockNotifications);
  }, [userRole]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    if (notification.type === "file_shared" && notification.fileId) {
      // In a real app, this would navigate to the file or open it
      toast({
        title: "Opening File",
        description: `Opening ${notification.fileName}...`
      });
    } else if (notification.type === "membership_request" && notification.groupId) {
      // Navigate to the group page with settings dialog open
      setOpen(false);
      router.push(`/coach/group/${notification.groupId}?tab=members&settings=true&requestsTab=true`);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {notification.type === "file_shared" && (
                          <Share2 className="h-4 w-4 text-primary" />
                        )}
                        {notification.type === "membership_request" && (
                          <Users className="h-4 w-4 text-secondary" />
                        )}
                        {notification.type === "admin_message" && (
                          <Bell className="h-4 w-4 text-blue-500" />
                        )}
                        {notification.type === "system" && (
                          <Eye className="h-4 w-4 text-green-500" />
                        )}
                        {notification.type === "maintenance" && (
                          <FileText className="h-4 w-4 text-yellow-500" />
                        )}
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                        {notification.category && (
                          <Badge variant="outline" className="text-xs">
                            {notification.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      className="ml-2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setOpen(false)}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}