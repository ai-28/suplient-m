"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { 
  MessageCircle, 
  Clock,
  AlertTriangle,
  Search
} from "lucide-react";
import { useChatSystem } from "@/app/hooks/useChatSystem";
import { ClientChatInfo } from "@/app/types/chat";
import { toast } from "@/app/hooks/use-toast";
import { UniversalChatInterface } from "@/app/components/UniversalChatInterface";

export default function CoachChatDashboard() {
  const { 
    getSortedClients, 
    getPriorityClients,
    getResponseGuaranteeText,
    isResponseOverdue,
    messages,
    setMessages
  } = useChatSystem();
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - in real app this would come from API
  const mockClients = [
    {
      id: "1",
      name: "John Doe",
      initials: "JD",
      type: "personal",
      responseGuarantee: 48,
      unreadCount: 2,
      isPriority: false,
      responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastMessage: {
        id: "1",
        senderId: "1",
        senderName: "John Doe",
        content: "I'm feeling anxious about tomorrow's presentation",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "sent",
        isCoach: false
      }
    },
    {
      id: "2",
      name: "Sarah Wilson",
      initials: "SW",
      type: "light",
      responseGuarantee: 168,
      unreadCount: 1,
      isPriority: true,
      responseDeadline: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      lastMessage: {
        id: "2",
        senderId: "2",
        senderName: "Sarah Wilson",
        content: "The breathing exercises aren't working for me",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "sent",
        isCoach: false
      }
    },
    {
      id: "3",
      name: "Mike Chen",
      initials: "MC",
      type: "group",
      responseGuarantee: 168,
      unreadCount: 3,
      isPriority: false,
      responseDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastMessage: {
        id: "3",
        senderId: "3",
        senderName: "Mike Chen",
        content: "Thank you for the group session yesterday",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "sent",
        isCoach: false
      }
    }
  ];

  const sortedClients = mockClients.sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    
    if (a.responseDeadline && b.responseDeadline) {
      return new Date(a.responseDeadline).getTime() - new Date(b.responseDeadline).getTime();
    }
    
    return 0;
  });

  const filteredClients = sortedClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const priorityClients = mockClients.filter(client => client.isPriority);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedClient) return;

    const newMessage = {
      id: Date.now().toString(),
      senderId: "coach",
      senderName: "Coach",
      content: message,
      timestamp: new Date().toISOString(),
      type: "text",
      status: "sent",
      isCoach: true
    };

    setMessages(prev => ({
      ...prev,
      [selectedClient.id]: [...(prev[selectedClient.id] || []), newMessage]
    }));

    setMessage("");
    
    toast({
      title: t("chat.messageSent"),
      description: `${t("chat.messageSentTo")} ${selectedClient.name}`,
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return t("chat.timeAgo.justNow");
    if (diffHours < 24) return `${diffHours}h ${t("chat.timeAgo.ago")}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${t("chat.timeAgo.ago")}`;
  };

  const getClientTypeColor = (type) => {
    switch (type) {
      case "personal": return "bg-purple-500";
      case "light": return "bg-blue-500";
      case "group": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{t("chat.coachDashboard")}</h2>
          <p className="text-muted-foreground mt-1">{t("chat.coachDashboardSubtitle")}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {priorityClients.length} {t("chat.overdue")}
          </Badge>
          <Badge variant="secondary">
            {filteredClients.length} {t("chat.totalClients")}
          </Badge>
        </div>
      </div>

      {/* Priority Alerts */}
      {priorityClients.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("chat.priorityAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priorityClients.map(client => (
                <div 
                  key={client.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {client.avatar && (
                        <AvatarImage 
                          src={client.avatar} 
                          alt={client.name} 
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className={`${getClientTypeColor(client.type)} text-white`}>
                        {client.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(`clients.clientTypes.${client.type}`)} • {t("chat.responseOverdue")}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedClient(client)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {t("chat.respond")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Client List */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("chat.searchClients")}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedClient?.id === client.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        {client.avatar && (
                          <AvatarImage 
                            src={client.avatar} 
                            alt={client.name} 
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className={`${getClientTypeColor(client.type)} text-white`}>
                          {client.initials}
                        </AvatarFallback>
                      </Avatar>
                      {client.isPriority && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{client.name}</p>
                        {client.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {client.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {t(`clients.clientTypes.${client.type}`)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getResponseGuaranteeText(client.type)}
                        </Badge>
                      </div>
                      {client.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {client.lastMessage.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {client.lastMessage && formatTime(client.lastMessage.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          {selectedClient ? (
            <UniversalChatInterface
              chatId={selectedClient.id}
              chatType={selectedClient.type}
              participantName={selectedClient.name}
              participantInitials={selectedClient.initials}
              participantAvatar={selectedClient.avatar || null}
              currentUserId="coach"
              currentUserRole="coach"
              allowScheduling={selectedClient.type === "light" || selectedClient.type === "group"}
              showSystemMessages={true}
              title={selectedClient.name}
            />
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("chat.selectClient")}</h3>
                <p className="text-muted-foreground">{t("chat.selectClientDescription")}</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}