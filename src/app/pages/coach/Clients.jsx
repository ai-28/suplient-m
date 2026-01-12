"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { PageHeader } from "@/app/components/PageHeader";
import { CreateClientDialog } from "@/app/components/CreateClientDialog";
import { ImportClientsDialog } from "@/app/components/ImportClientsDialog";
import { 
  Users, 
  MessageCircle,
  Calendar,
  Settings,
  Filter,
  List,
  LayoutGrid,
  TrendingUp,
  UserPlus,
  CalendarCheck,
  Trophy,
  UserX,
  ChevronDown,
  ArrowUpDown,
  StickyNote,
  MoreVertical,
  Ban,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuItem
} from "@/app/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/context/LanguageContext";

// Real data will be fetched from API and stored in clients state

// Helper function to format date in local timezone
// Expects ISO string (UTC) from API and converts to local time for display
const formatDateLocal = (dateString) => {
  if (!dateString) return 'Never';
  
  // Parse UTC timestamp (ISO string with 'Z' or explicit UTC)
  // JavaScript's Date automatically converts UTC to local timezone
  let date;
  if (typeof dateString === 'string') {
    // If it's an ISO string (ends with Z), Date will parse it as UTC
    // If it doesn't have timezone, assume UTC (since API sends UTC)
    const trimmed = dateString.trim();
    if (!trimmed.endsWith('Z') && !trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
      // No timezone indicator - treat as UTC
      date = new Date(trimmed + 'Z');
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = new Date(dateString);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) return 'Never';
  
  // Format in local timezone (toLocaleString automatically uses browser's timezone)
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    // Today - show time only
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } else if (diffInHours < 48) {
    // Yesterday
    return 'Yesterday ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } else {
    // Older - show date and time
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    }) + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
};

export default function Clients() {
  const { data: session } = useSession();
  const t = useTranslation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("clients.all"); // Show all clients by default including inactive
  const [viewMode, setViewMode] = useState("funnel"); // "list" or "funnel"
  const [visibleColumns, setVisibleColumns] = useState({});
  const [sortBy, setSortBy] = useState("activity"); // "activity", "name", "created", "unread", "session", "oldest", "type"
  const [suspending, setSuspending] = useState(false);
  const router = useRouter();

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

  // Fetch clients data from API
  const fetchClients = async () => {
    try {
      console.log('📨 DEBUG: fetchClients called');
      setLoading(true);
      const response = await fetch('/api/clients');
      const data = await response.json();
      
      if (data.status) {
        setClients(data.clients || []);
      } else {
        console.error('Failed to fetch clients:', data.message);
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time unread count updates
  useEffect(() => {
    const handleUnreadCountUpdate = async (event) => {
      const { conversationId, participantId } = event.detail;
      
      // Only update if this event is for the current coach
      if (participantId === session?.user?.id) {
        // Fetch updated unread count for this specific conversation
        try {
          const response = await fetch(`/api/clients/unread-count?conversationId=${conversationId}`);
          if (response.ok) {
            const data = await response.json();
            
            // Update the specific client's unread count in state
            setClients(prevClients => 
              prevClients.map(client => {
                if (data.clientId && client.id === data.clientId) {
                  return {
                    ...client,
                    unreadMessages: data.unreadCount
                  };
                }
                return client;
              })
            );
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
          // Fallback to full refresh if targeted update fails
          fetchClients();
        }
      }
    };

    window.addEventListener('update_unread_count', handleUnreadCountUpdate);
    
    return () => {
      window.removeEventListener('update_unread_count', handleUnreadCountUpdate);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch pipeline stages from database
  useEffect(() => {
    const fetchPipelineStages = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/pipeline/client');
        const data = await response.json();
        
        if (data.success && data.stages && data.stages.length > 0) {
          // Map stages with default icons
          const stagesWithIcons = data.stages.map(stage => ({
            ...stage,
            icon: defaultIcons[stage.id] || UserPlus,
            description: stage.name
          }));
          setFunnelStages(stagesWithIcons);

          // Update visible columns based on isVisible property
          const visibilityMap = {};
          data.stages.forEach(stage => {
            visibilityMap[stage.id] = stage.isVisible !== undefined ? stage.isVisible : true;
          });
          setVisibleColumns(visibilityMap);
        }
      } catch (error) {
        console.error('Error fetching pipeline stages:', error);
      }
    };

    fetchPipelineStages();
  }, [session?.user?.id]);

  // Handle client creation callback
  const handleClientCreated = (newClient) => {
    console.log('New client created:', newClient);
    // Refresh the clients list
    fetchClients();
  };

  // Handle client stage change
  const handleClientStageChange = async (clientId, newStage) => {
    try {
      console.log(`Moving client ${clientId} to stage ${newStage}`);
      
      const response = await fetch(`/api/clients/${clientId}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) {
        throw new Error('Failed to update client stage');
      }

      // Refresh clients list to show updated stage
      await fetchClients();
      
      toast.success('Client stage updated successfully');
    } catch (error) {
      console.error('Error updating client stage:', error);
      toast.error('Failed to update client stage');
    }
  };

  // Handle client activate/deactivate
  const handleSuspend = async (clientId, currentStatus) => {
    try {
      setSuspending(true);
      // Normalize status to lowercase for comparison
      const normalizedStatus = (currentStatus || '').toLowerCase();
      const newStatus = normalizedStatus === 'active' ? 'inactive' : 'active';
      const action = newStatus === 'inactive' ? 'suspend' : 'activate';
      
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: clientId,
          status: newStatus
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the client in the list
        setClients(clients.map(client => 
          client.id === clientId ? { ...client, status: newStatus === 'active' ? 'Active' : 'Inactive' } : client
        ));
        toast.success(`Client ${action}ed successfully!`, {
          description: `Client status changed to ${newStatus}.`
        });
        // Refresh clients to ensure consistency
        await fetchClients();
      } else {
        console.error(`Failed to ${action} client:`, data.error);
        toast.error(`Failed to ${action} client`, {
          description: data.error
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing client:`, error);
      toast.error(`Error ${action}ing client`, {
        description: 'Please try again.'
      });
    } finally {
      setSuspending(false);
    }
  };


  // Default funnel stages with icons (as fallback)
  const defaultIcons = {
    light: UserPlus,
    group: CalendarCheck,
    personal: Trophy,
    completed: Trophy,
    inactive: UserX
  };

  const [funnelStages, setFunnelStages] = useState([]);

  const filteredClients = clients.filter(client => {
    if (filter === "clients.all") return true;
    if (filter === "status.active") return client.status === "Active";
    if (filter === "status.inactive") return client.status === "Inactive";
    return true;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortBy) {
      case "name":
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      case "created":
        return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
      case "unread":
        return (b.unreadMessages || 0) - (a.unreadMessages || 0);
      case "session":
        if (!a.scheduledSession && !b.scheduledSession) return 0;
        if (!a.scheduledSession) return 1;
        if (!b.scheduledSession) return -1;
        return new Date(a.scheduledSession).getTime() - new Date(b.scheduledSession).getTime();
      case "oldest":
        const lastActiveA = (a.lastActive || '').toLowerCase();
        const lastActiveB = (b.lastActive || '').toLowerCase();
        return lastActiveA.localeCompare(lastActiveB);
      case "type":
        const typeOrder = { 'Personal': 0, 'Group': 1 };
        return (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2);
      case "activity":
      default:
        const lastActiveA2 = (a.lastActive || '').toLowerCase();
        const lastActiveB2 = (b.lastActive || '').toLowerCase();
        return lastActiveB2.localeCompare(lastActiveA2);
    }
  });

  const getClientsByStage = (stageId) => {
    return sortedClients.filter(client => client.stage === stageId);
  };

  const getStageColor = (stageId) => {
    const stage = funnelStages.find(s => s.id === stageId);
    if (!stage) return 'bg-accent text-accent-foreground';
    
    // Convert bg-color-500 to bg-color-100 text-color-800 for badges
    const colorMap = {
      'bg-blue-500': 'bg-blue-100 text-blue-800',
      'bg-green-500': 'bg-green-100 text-green-800',
      'bg-yellow-500': 'bg-yellow-100 text-yellow-800',
      'bg-purple-500': 'bg-purple-100 text-purple-800',
      'bg-red-500': 'bg-red-100 text-red-800',
      'bg-pink-500': 'bg-pink-100 text-pink-800',
      'bg-orange-500': 'bg-orange-100 text-orange-800',
      'bg-gray-500': 'bg-gray-100 text-gray-800',
    };
    
    return colorMap[stage.color] || 'bg-accent text-accent-foreground';
  };

  if (loading) {
    return (
      <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className={`animate-spin rounded-full ${isMobile ? 'h-6 w-6' : 'h-8 w-8'} border-b-2 border-primary mx-auto mb-4`}></div>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''} overflow-x-hidden max-w-full`}>
        {/* Page Header */}
        <PageHeader 
          title={t('navigation.clients')} 
          subtitle={t('clients.title')}
        >
          {/* View Toggle */}
          <div className={`flex rounded-lg border border-border bg-background ${isMobile ? 'p-0.5' : 'p-1'}`}>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size={isMobile ? "sm" : "sm"}
              onClick={() => setViewMode("list")}
              className={`${isMobile ? 'gap-1 px-2 text-xs' : 'gap-2'}`}
            >
              <List className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              {!isMobile && "List"}
            </Button>
            <Button
              variant={viewMode === "funnel" ? "default" : "ghost"}
              size={isMobile ? "sm" : "sm"}
              onClick={() => setViewMode("funnel")}
              className={`${isMobile ? 'gap-1 px-2 text-xs' : 'gap-2'}`}
            >
              <LayoutGrid className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              {!isMobile && "Cards"}
            </Button>
          </div>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {!isMobile && <ImportClientsDialog onClientsImported={handleClientCreated} />}
            <CreateClientDialog onClientCreated={handleClientCreated} />
          </div>
        </PageHeader>

      {/* Controls */}
      <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2 pt-3' : 'gap-3 pt-4'} border-t border-border overflow-x-auto max-w-full`}>
        {/* Column Visibility and Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`${isMobile ? 'gap-1 text-xs px-2 h-8' : 'gap-2'}`} size={isMobile ? "sm" : "default"}>
              <Filter className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              {isMobile ? "Filter" : "Filter and Columns"}
              <ChevronDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>{"Status"}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem 
              checked={filter === "status.active"}
              onCheckedChange={() => setFilter("status.active")}
            >
              {"Active"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={filter === "status.inactive"}
              onCheckedChange={() => setFilter("status.inactive")}
            >
                {"Inactive"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={filter === "clients.all"}
              onCheckedChange={() => setFilter("clients.all")}
            >
              {"All"}
            </DropdownMenuCheckboxItem>
            
            {viewMode === "funnel" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{"Visible Columns"}</DropdownMenuLabel>
                {funnelStages.map((stage) => (
                  <DropdownMenuCheckboxItem
                    key={stage.id}
                    checked={visibleColumns[stage.id]}
                    onCheckedChange={() => setVisibleColumns(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                  >
                    {stage.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sorting Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`${isMobile ? 'gap-1 text-xs px-2 h-8' : 'gap-2'}`} size={isMobile ? "sm" : "default"}>
              <ArrowUpDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              {"Sort By"}
              <ChevronDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>{"Sort By"}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "activity"}
              onCheckedChange={() => setSortBy("activity")}
            >
              {"Latest Activity"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "name"}
              onCheckedChange={() => setSortBy("name")}
            >
              {"Name A-Z"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "created"}
              onCheckedChange={() => setSortBy("created")}
            >
              {"Created Date"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "unread"}
              onCheckedChange={() => setSortBy("unread")}
            >
              {"Unread Messages"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "session"}
              onCheckedChange={() => setSortBy("session")}
            >
              {"Next Session"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "oldest"}
              onCheckedChange={() => setSortBy("oldest")}
            >
              {"Last Login"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem 
              checked={sortBy === "type"}
              onCheckedChange={() => setSortBy("type")}
            >
              {"Type"}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Funnel View */}
      {viewMode === "funnel" && (
        <div className="space-y-6 overflow-x-hidden max-w-full">
          {/* Funnel Columns */}
          <div className={`${isMobile ? 'flex flex-col' : 'grid gap-4'} overflow-x-auto`} style={!isMobile ? { gridTemplateColumns: `repeat(${Object.values(visibleColumns).filter(Boolean).length}, minmax(280px, 1fr))` } : {}}>
            {funnelStages.filter(stage => visibleColumns[stage.id]).map((stage) => {
              const stageClients = getClientsByStage(stage.id);
              return (
                <Card key={stage.id} className={`card-standard flex flex-col ${isMobile ? 'h-auto mb-4' : 'h-[600px]'} ${isMobile ? 'p-3' : ''} min-w-[280px] max-w-full`}>
                   <CardHeader className={`pb-4 flex-shrink-0 ${isMobile ? 'pb-3 px-0' : ''}`}>
                     <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-foreground flex items-center justify-between`}>
                       <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                         <div className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} rounded-full ${stage.color}`} />
                         <span>{stage.name}</span>
                       </div>
                       <span className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-primary`}>{stageClients.length}</span>
                     </CardTitle>
                   </CardHeader>
                  <CardContent className={`space-y-3 flex-1 ${isMobile ? 'space-y-2 px-0' : ''} ${isMobile ? 'max-h-96' : ''} overflow-y-auto`}>
                     {stageClients.map((client) => (
                       <div
                         key={client.id}
                         className={`${isMobile ? 'p-2 h-auto' : 'p-4 h-[140px]'} rounded-lg border cursor-pointer transition-colors flex flex-col ${
                           client.status === "Inactive" || client.status === "inactive"
                             ? "border-orange-300 bg-orange-50/50 hover:bg-orange-100/50"
                             : "border-border bg-background hover:bg-muted/50"
                         }`}
                         onClick={() => router.push(`/coach/clients/${client.id}`)}
                       >
                         <div className={`flex items-center ${isMobile ? 'gap-1.5 mb-2' : 'gap-2 mb-3'}`}>
                           <Avatar className={isMobile ? 'h-6 w-6' : 'h-8 w-8'}>
                             {client.avatar && (
                               <AvatarImage 
                                 src={client.avatar} 
                                 alt={client.name} 
                                 className="object-cover"
                               />
                             )}
                             <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                               {client.name.split(' ').map(n => n[0]).join('')}
                             </AvatarFallback>
                           </Avatar>
                           <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} flex-1`}>
                             <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>{client.name}</span>
                             {(client.status === "Inactive" || client.status === "inactive") && (
                               <Badge variant="outline" className={`${isMobile ? 'text-[10px] px-1 py-0' : 'text-xs'} bg-orange-100 text-orange-700 border-orange-300`}>
                                 Inactive
                               </Badge>
                             )}
                           </div>
                           <span className={`${isMobile ? 'text-base' : 'text-xl'} ml-auto`}>{client.mood}</span>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 className={isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <MoreVertical className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                               <DropdownMenuLabel>Move to Stage</DropdownMenuLabel>
                               <DropdownMenuSeparator />
                               {funnelStages.map((stageOption) => (
                                 <DropdownMenuItem
                                   key={stageOption.id}
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleClientStageChange(client.id, stageOption.id);
                                   }}
                                   disabled={stageOption.id === client.stage}
                                 >
                                   <div className="flex items-center gap-2">
                                     <div className={`w-3 h-3 rounded-full ${stageOption.color}`} />
                                     {stageOption.name}
                                   </div>
                                 </DropdownMenuItem>
                               ))}
                               <DropdownMenuSeparator />
                               <DropdownMenuItem
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleSuspend(client.id, client.status);
                                 }}
                                 disabled={suspending}
                                 className={client.status === "Active" ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                               >
                                 {suspending ? (
                                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                 ) : (
                                   <Ban className="h-4 w-4 mr-2" />
                                 )}
                                 {client.status === "Active" ? "Deactivate" : "Activate"}
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                          <div className="flex gap-1 mb-3 items-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0 hover:bg-primary hover:text-primary-foreground relative"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/coach/clients/${client.id}`);
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  {client.unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                      {client.unreadMessages}
                                    </span>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  {client.lastMessage && client.lastMessage !== 'No recent messages' 
                                    ? `${client.lastMessage.split(' ').slice(0, 15).join(' ')}${client.lastMessage.split(' ').length > 15 ? '...' : ''}`
                                    : 'No recent messages'
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/coach/clients/${client.id}`);
                                  }}
                                >
                                  <StickyNote className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  {client.lastNote && client.lastNote !== 'No recent notes' 
                                    ? `${client.lastNote.split(' ').slice(0, 15).join(' ')}${client.lastNote.split(' ').length > 15 ? '...' : ''}`
                                    : 'No recent notes'
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                           </div>
                           <div className="mt-auto">
                             {client.scheduledSession && (
                               <div className="flex items-center gap-2 text-xs">
                                 <Calendar className="h-4 w-4 text-muted-foreground" />
                                 <span className="text-muted-foreground">
                                   {client.scheduledSession}
                                 </span>
                               </div>
                             )}
                           </div>
                      </div>
                    ))}
                    {stageClients.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        {"No clients in this stage"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className={`shadow-soft border-border bg-card ${isMobile ? 'p-3' : ''} overflow-x-hidden max-w-full`}>
           <CardHeader className={isMobile ? 'px-0 pb-3' : ''}>
             <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
               <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
               {"Client List"} ({sortedClients.length})
             </CardTitle>
           </CardHeader>
          <CardContent className={`${isMobile ? 'px-0' : ''} overflow-x-auto max-w-full`}>
            <div className={`space-y-1 ${isMobile ? 'space-y-3' : ''} min-w-0`}>
              {/* Header Row - Hidden on mobile */}
              {!isMobile && (
                <div className="grid grid-cols-8 gap-4 p-4 text-sm font-medium text-muted-foreground bg-muted/30 rounded-lg min-w-[800px]">
                  <div>Name</div>
                  <div>Type</div>
                  <div>Status</div>
                  <div>Mood</div>
                  <div>Last Login</div>
                  <div>Created</div>
                  <div>Session</div>
                  <div>Actions</div>
                </div>
              )}

              {/* Client Rows */}
              {sortedClients.map((client) => {
                const getStageDisplayName = (stage) => {
                  switch (stage) {
                    case 'light': return 'Light';
                    case 'group': return 'Group';
                    case 'personal': return 'Personal';
                    case 'completed': return 'Completed';
                    case 'inactive': return 'Inactive';
                    default: return stage;
                  }
                };
                
                return (
                  <div 
                    key={client.id} 
                    className={`${isMobile ? 'flex flex-col space-y-3 p-3' : 'grid grid-cols-8 gap-4 p-4 min-w-[800px]'} rounded-lg transition-colors cursor-pointer ${
                      client.status === "Inactive" || client.status === "inactive"
                        ? "border border-orange-300 bg-orange-50/50 hover:bg-orange-100/50"
                        : "border border-transparent hover:bg-muted/50 hover:border-border"
                    }`}
                    onClick={() => router.push(`/coach/clients/${client.id}`)}
                  >
                    {isMobile ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {client.avatar && (
                                <AvatarImage 
                                  src={client.avatar} 
                                  alt={client.name} 
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-foreground font-medium text-sm">{client.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${getStageColor(client.stage)} border-0 font-medium text-xs`}>
                                  {getStageDisplayName(client.stage)}
                                </Badge>
                                <Badge 
                                  className={`text-xs ${client.status === 'Active' || client.status === 'active'
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-orange-100 text-orange-700 border-orange-300'
                                  }`}
                                >
                                  {client.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-2xl">{client.mood}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Last Login: </span>
                            <span className="text-foreground">{formatDateLocal(client.lastActive)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created: </span>
                            <span className="text-foreground">{formatDateLocal(client.created)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Session: </span>
                            <span className="text-foreground">{client.scheduledSession || "No Session"}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={isMobile ? 'h-7 w-7 p-0' : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/coach/clients/${client.id}/chat`);
                            }}
                          >
                            <MessageCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Message</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={isMobile ? 'h-7 w-7 p-0' : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/coach/clients/${client.id}`);
                            }}
                          >
                            <Settings className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Settings</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    </>
                    ) : (
                      <>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {client.avatar && (
                          <AvatarImage 
                            src={client.avatar} 
                            alt={client.name} 
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground font-medium">{client.name}</span>
                    </div>
                    <div>
                      <Badge className={`${getStageColor(client.stage)} border-0 font-medium`}>
                        {getStageDisplayName(client.stage)}
                      </Badge>
                    </div>
                    <div>
                      <Badge 
                        className={`${client.status === 'Active' || client.status === 'active'
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-orange-100 text-orange-700 border-orange-300'
                        }`}
                      >
                        {client.status}
                      </Badge>
                    </div>
                    <div className="text-2xl">{client.mood}</div>
                    <div className="text-sm text-foreground">{formatDateLocal(client.lastActive)}</div>
                    <div className="text-sm text-muted-foreground">{formatDateLocal(client.created)}</div>
                    <div className="text-sm text-muted-foreground">
                      {client.scheduledSession || "No Session"}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} p-0 hover:bg-primary hover:text-primary-foreground relative`}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/coach/clients/${client.id}/chat`);
                            }}
                          >
                            <MessageCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                            {client.unreadMessages > 0 && (
                              <span className={`absolute -top-1 -right-1 bg-red-500 text-white ${isMobile ? 'text-[10px] h-3 w-3' : 'text-xs rounded-full h-4 w-4'} flex items-center justify-center`}>
                                {client.unreadMessages}
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {client.lastMessage && client.lastMessage !== 'No recent messages' 
                              ? `${client.lastMessage.split(' ').slice(0, 15).join(' ')}${client.lastMessage.split(' ').length > 15 ? '...' : ''}`
                              : 'No recent messages'
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={isMobile ? 'h-7 w-7 p-0' : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/coach/clients/${client.id}`);
                            }}
                          >
                            <Settings className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Settings</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
}