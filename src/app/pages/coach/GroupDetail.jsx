"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/app/context/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { 
  ArrowLeft, 
  Calendar, 
  Settings, 
  UserPlus,
  MessageCircle,
  MoreVertical,
  Activity,
  TrendingUp,
  Clock,
  Users,
  FileText,
  Video,
  CheckCircle,
  Eye
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { GroupSettingsDialog } from "@/app/components/GroupSettingsDialog";
import { ScheduleSessionDialog } from "@/app/components/ScheduleSessionDialog";
import { GroupChatInterface } from "@/app/components/GroupChatInterface";
import { GroupInfoPanel } from "@/app/components/GroupInfoPanel";
import { GroupMembersPanel } from "@/app/components/GroupMembersPanel";
import { GroupTasksPanel } from "@/app/components/GroupTasksPanel";
import { GroupNotesPanel } from "@/app/components/GroupNotesPanel";
import { GroupFilesPanel } from "@/app/components/GroupFilesPanel";
import { AddMemberToGroupDialog } from "@/app/components/AddMemberToGroupDialog";
import { useGroupProgress } from '@/app/hooks/useGroupProgress';

// Helper: Parse UTC timestamp correctly (server sends UTC timestamps without timezone)
const parseAsUTC = (input) => {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.endsWith('Z') || trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
      return new Date(trimmed);
    }
    const normalized = trimmed.replace(/\s+/, 'T');
    return new Date(normalized + 'Z');
  }
  return new Date(input);
};

// Helper function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  const date = parseAsUTC(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });
};

// Helper function to format time for display
const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function GroupDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation();
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [enrollClientOpen, setEnrollClientOpen] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Get real group progress data
  const { progressData, loading: progressLoading, error: progressError } = useGroupProgress(id);
  
  // Fetch group data
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/groups/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch group data');
      }
      
      const result = await response.json();
      setGroupData(result.group);
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle tab from URL parameters
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && ['overview', 'members', 'analytics'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  // Fetch group data on component mount
  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
  }, [id]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('groups.loadingGroupData', 'Loading group data...')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{t('common.messages.error')}: {error}</p>
          <Button onClick={fetchGroupData}>{t('common.buttons.tryAgain', 'Try Again')}</Button>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!groupData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('groups.groupNotFound', 'Group not found')}</p>
          <Button onClick={() => router.push('/coach/groups')}>{t('groups.backToGroups', 'Back to Groups')}</Button>
        </div>
      </div>
    );
  }

  // Get session-based data (frequency, duration, location)
  const getSessionBasedData = () => {
    if (!groupData.sessions || groupData.sessions.length === 0) {
      return {
        frequency: 'Not specified',
        duration: 'Not specified',
        location: 'Not specified'
      };
    }

    // Get most common values from sessions
    const sessions = groupData.sessions;
    const durations = sessions.map(s => s.duration).filter(Boolean);
    const locations = sessions.map(s => s.location).filter(Boolean);
    
    // Calculate frequency based on session dates
    const sessionDates = sessions.map(s => new Date(s.sessionDate)).sort();
    let frequency = 'Not specified';
    if (sessionDates.length > 1) {
      const avgDaysBetween = (sessionDates[sessionDates.length - 1] - sessionDates[0]) / (sessionDates.length - 1) / (1000 * 60 * 60 * 24);
      if (avgDaysBetween <= 7) frequency = 'Weekly';
      else if (avgDaysBetween <= 14) frequency = 'Bi-weekly';
      else if (avgDaysBetween <= 30) frequency = 'Monthly';
      else frequency = 'Irregular';
    }

    // Use next session's duration and location if available, otherwise fall back to most common
    let duration = 'Not specified';
    let location = 'Not specified';

    if (groupData.nextSession) {
      duration = groupData.nextSession.duration ? `${groupData.nextSession.duration} minutes` : 'Not specified';
      location = groupData.nextSession.location || 'Not specified';
    } 

    return {
      frequency,
      duration,
      location
    };
  };

  const sessionData = getSessionBasedData();

  // Transform group data to match expected format
  const group = {
    id: groupData.id,
    name: groupData.name,
    members: groupData.memberCount,
    nextSession: groupData.nextSession ? formatDate(groupData.nextSession.date) : 'No upcoming session',
    avatars: groupData.members?.map(member => member.initials) || [],
    description: groupData.description || 'No description available',
    frequency: sessionData.frequency,
    duration: sessionData.duration,
    location: sessionData.location,
    capacity: groupData.capacity ? `${groupData.capacity} members` : 'Not specified',
    startDate: groupData.createdAt ? formatDate(groupData.createdAt) : 'Not specified',
    totalSessions: groupData.totalSessions || 0,
    completedSessions: groupData.completedSessions || 0,
    detailedMembers: groupData.members?.map((member, index) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      initials: member.initials,
      status: member.status,
      joinDate: formatDate(member.joinDate),
      attendance: member.attendance,
      color: `hsl(var(--chart-${(index % 5) + 1}))`
    })) || []
  };

  console.log("group",groupData)

  
  // Use real data if available, otherwise show empty state
  const groupProgressData = progressData ? {
    ...progressData,
    weeklyAverages: progressData.weeklyAverages || [],
    members: progressData.members || []
  } : {
    weeklyAverages: [],
    members: [],
    stats: { totalMembers: 0, activeMembers: 0, totalCheckIns: 0, totalTasksCompleted: 0, totalSessionsAttended: 0, totalSessionsScheduled: 0 }
  };
console.log(groupProgressData)
  const handleMemberOverviewClick = (memberId, memberName) => {
    // Navigate to member's profile overview from member name/avatar clicks
    router.push(`/coach/clients/${memberId}?from=group&groupId=${id}&groupTab=${activeTab}&tab=overview&memberName=${encodeURIComponent(memberName)}`);
  };

  const handleMemberProgressClick = (memberId, memberName) => {
    // Navigate to member's profile progress from "View Details" button clicks
    router.push(`/coach/clients/${memberId}?from=group&groupId=${id}&groupTab=${activeTab}&tab=progress&memberName=${encodeURIComponent(memberName)}`);
  };

  const handleAddMember = () => {
    setEnrollClientOpen(true);
  };

  const handleScheduleSession = () => {
    setScheduleDialogOpen(true);
  };

  const handleGroupSettings = () => {
    setGroupSettingsOpen(true);
  };

    const handleMessageMember = (memberName) => {
    console.log(`Messaging ${memberName}`);
  };

  const handleMemberAdded = (memberData) => {
    console.log(`Added member: ${memberData.name} (${memberData.email}) via ${memberData.type}`);
    // Refresh the group data to show the new member
    fetchGroupData();
  };

  return (
    <div className={`flex flex-col bg-background ${isMobile ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'} ${isMobile ? 'p-4' : 'p-6'} border-b bg-background`}>
        <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'gap-4'}`}>
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "sm"}
            onClick={() => router.push("/coach/groups")}
            className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8' : 'gap-2'}`}
          >
            <ArrowLeft className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            {!isMobile && t('groups.backToGroups', 'Back to Groups')}
          </Button>
          <div className={isMobile ? 'flex-1 text-center' : ''}>
            <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{group.name}</h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>{group.description}</p>
          </div>
        </div>
        <div className={`flex items-center ${isMobile ? 'w-full gap-2 justify-center flex-wrap' : 'gap-2'}`}>
          <Button onClick={handleAddMember} size={isMobile ? "sm" : "sm"} className={isMobile ? 'text-xs px-2 h-8 flex-1' : ''}>
            <UserPlus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-2'}`} />
            {isMobile ? 'Add' : t('groups.addMember', 'Add Member')}
          </Button>
          <Button onClick={handleGroupSettings} variant="outline" size={isMobile ? "sm" : "sm"} className={isMobile ? 'text-xs px-2 h-8 flex-1' : ''}>
            <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-2'}`} />
            {isMobile ? 'Settings' : t('groups.groupSettings', 'Group Settings')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
          <div className={`${isMobile ? 'px-4 pt-3' : 'px-6 pt-4'}`}>
            <TabsList className={`w-full ${isMobile ? 'grid grid-cols-3 gap-1 h-auto p-1' : ''}`}>
              <TabsTrigger value="overview" className={`${isMobile ? 'text-xs px-1 py-1.5' : 'flex-1'}`}>{t('common.labels.overview', 'Overview')}</TabsTrigger>
              <TabsTrigger value="members" className={`${isMobile ? 'text-xs px-1 py-1.5' : 'flex-1'}`}>{t('groups.members', 'Members')}</TabsTrigger>
              <TabsTrigger value="analytics" className={`${isMobile ? 'text-xs px-1 py-1.5' : 'flex-1'}`}>{isMobile ? 'Progress' : t('groups.progressActivity', 'Progress Activity')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} flex-1`}>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 lg:grid-cols-[3fr_4fr_3fr] gap-6'} ${isMobile ? '' : 'h-full min-h-[calc(100vh-200px)]'}`}>
              {/* Left Column */}
              <div className="flex flex-col space-y-6">
                <GroupInfoPanel 
                  group={group} 
                  onSettings={handleGroupSettings}
                  onAddMember={handleAddMember}
                />
                <div className="flex-1 flex flex-col">
                  <GroupTasksPanel groupId={group.id} memberCount={group.members} />
                </div>
              </div>

              {/* Center Column */}
              <div className="flex flex-col justify-end h-full">
                <GroupChatInterface 
                  groupId={group.id}
                  groupName={group.name}
                  members={group.members}
                  activeMembers={group.detailedMembers.filter(m => m.status === "active").length}
                />
              </div>

              {/* Right Column */}
              <div className="flex flex-col space-y-6">
                <GroupNotesPanel groupId={group.id} />
                <div className="flex-1 flex flex-col">
                  <GroupFilesPanel groupId={group.id} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
            <GroupMembersPanel 
              members={group.detailedMembers}
              groupId={group.id}
              onMemberClick={handleMemberOverviewClick}
                onMessageMember={(memberId) => {
                const member = group.detailedMembers.find(m => m.id === memberId);
                if (member) handleMessageMember(member.name);
              }}
            />
          </TabsContent>
        
          <TabsContent value="analytics" className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
            <div className="space-y-6 pb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {t('groups.analytics', 'Analytics')}
                    </CardTitle>
                    <CardDescription>
                      {t('groups.analyticsDescription', 'View group progress and activity')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className={`${isMobile ? 'h-[300px]' : 'h-[400px]'}`}>
                      {progressLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className={`${isMobile ? 'text-sm' : ''} text-gray-600`}>Loading progress data...</p>
                          </div>
                        </div>
                      ) : progressError ? (
                        <div className="flex items-center justify-center h-full text-red-500">
                          <div className="text-center">
                            <div className="text-red-500 mb-2">⚠️</div>
                            <p className={`${isMobile ? 'text-sm' : ''} font-medium`}>Error loading progress data</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 mt-1`}>{progressError}</p>
                          </div>
                        </div>
                      ) : !progressData ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <TrendingUp className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mx-auto mb-2`} />
                            <p className={`${isMobile ? 'text-sm' : ''} font-medium`}>No progress data available</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>Group needs activity to see progress</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                          <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 300 : 400}>
                            <LineChart data={groupProgressData.weeklyAverages} margin={isMobile ? { top: 5, right: 5, left: -20, bottom: 5 } : { top: 5, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="week" 
                                tick={{ fontSize: isMobile ? 10 : 12 }}
                                interval={isMobile ? "preserveStartEnd" : 0}
                                angle={isMobile ? -45 : 0}
                                textAnchor={isMobile ? "end" : "middle"}
                                height={isMobile ? 60 : 30}
                              />
                              <YAxis 
                                domain={[0, 10]} 
                                tick={{ fontSize: isMobile ? 10 : 12 }}
                                width={isMobile ? 30 : 50}
                              />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                       <div className={`bg-white ${isMobile ? 'p-2 text-xs' : 'p-3'} border rounded-lg shadow-lg`}>
                                         <p className={`${isMobile ? 'text-xs' : ''} font-medium`}>{label}</p>
                                         <p className={`${isMobile ? 'text-xs' : ''} text-blue-600`}>
                                           {"Performance"}: {data.performance}
                                         </p>
                                         <p className={`${isMobile ? 'text-xs' : ''} text-green-600`}>
                                           {"Wellbeing"}: {data.wellbeing}
                                         </p>
                                         <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 mt-1`}>
                                           {"Based on members"}: {data.memberCount}
                                         </p>
                                       </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend 
                                wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
                                iconSize={isMobile ? 10 : 12}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="performance" 
                                stroke="#3b82f6" 
                                strokeWidth={isMobile ? 2 : 3}
                                name={"Group Performance"}
                                dot={!isMobile}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="wellbeing" 
                                stroke="#10b981" 
                                strokeWidth={isMobile ? 2 : 3}
                                name={"Group Wellbeing"}
                                dot={!isMobile}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Member Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className={isMobile ? "text-base" : ""}>{"Member Progress"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!groupProgressData.members || groupProgressData.members.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No member progress data available</p>
                      </div>
                    ) : isMobile ? (
                      // Mobile: Card-based layout
                      <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[250px]'}`}>
                        <div className={`space-y-3 ${isMobile ? 'pr-2' : 'pr-4'}`}>
                          {groupProgressData.members.map((member) => (
                          <div key={member.id} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {member.avatar && (
                                    <AvatarImage 
                                      src={member.avatar} 
                                      alt={member.name} 
                                      className="object-cover"
                                    />
                                  )}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{member.name}</span>
                              </div>
                              <Badge variant={member.status === "Active" ? "default" : "secondary"} className="text-xs">
                                {member.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Performance</span>
                                  <span className="text-xs font-medium">{member.currentMetrics.performance}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500"
                                    style={{ width: `${member.currentMetrics.performance * 10}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Wellbeing</span>
                                  <span className="text-xs font-medium">{member.currentMetrics.wellbeing}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500"
                                    style={{ width: `${member.currentMetrics.wellbeing * 10}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMemberProgressClick(member.id, member.name)}
                              className="w-full flex items-center justify-center gap-1 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                              {"View Details"}
                            </Button>
                          </div>
                        ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      // Desktop: Table layout
                      <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[400px]'}`}>
                        <div className="border rounded-lg overflow-x-auto">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{"Member"}</TableHead>
                              <TableHead>{"Status"}</TableHead>
                              <TableHead>{"Current Performance"}</TableHead>
                              <TableHead>{"Current Wellbeing"}</TableHead>
                              <TableHead>{"Actions"}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupProgressData.members && groupProgressData.members.length > 0 ? (
                              groupProgressData.members.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      {member.avatar && (
                                        <AvatarImage 
                                          src={member.avatar} 
                                          alt={member.name} 
                                          className="object-cover"
                                        />
                                      )}
                                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                        {member.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{member.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                                    {member.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-500"
                                        style={{ width: `${member.currentMetrics.performance * 10}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{member.currentMetrics.performance}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-green-500"
                                        style={{ width: `${member.currentMetrics.wellbeing * 10}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{member.currentMetrics.wellbeing}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMemberProgressClick(member.id, member.name)}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    {"View Details"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">No member progress data available</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <GroupSettingsDialog 
        open={groupSettingsOpen} 
        onOpenChange={setGroupSettingsOpen}
        group={group}
      />
      <ScheduleSessionDialog 
        open={scheduleDialogOpen} 
        onOpenChange={setScheduleDialogOpen}
        groupName={group.name}
        groupMembers={group.members}
      />
      <AddMemberToGroupDialog
        open={enrollClientOpen}
        onOpenChange={setEnrollClientOpen}
        groupName={group.name}
        onAddMember={handleMemberAdded}
        groupId={group.id}
      />
    </div>
  );
}