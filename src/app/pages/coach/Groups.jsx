"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGroups } from "@/app/hooks/useGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { PageHeader } from "@/app/components/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/app/components/ui/dropdown-menu";
import { CreateGroupDialog } from "@/app/components/CreateGroupDialog";
import { ScheduleSessionDialog } from "@/app/components/ScheduleSessionDialog";
import { GroupSettingsDialog } from "@/app/components/GroupSettingsDialog";
import { 
  Users2, 
  UserPlus, 
  Calendar,
  Settings,
  MessageCircle,
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Clock,
  PlayCircle,
  CheckCircle,
  PauseCircle,
  MoreVertical,
  Plus,
  StickyNote
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { useTranslation } from "@/app/context/LanguageContext";

// Default icons for group stages
const defaultGroupIcons = {
  upcoming: Clock,
  ongoing: PlayCircle,
  completed: CheckCircle,
  inactive: PauseCircle
};

export default function Groups() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslation();
  const { groups, loading, error, refetchGroups, updateGroupStage } = useGroups();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupForSettings, setSelectedGroupForSettings] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all');
  const [groupPipelineStages, setGroupPipelineStages] = useState([]);
  const [visibleStages, setVisibleStages] = useState({});

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

  // Fetch pipeline stages from database
  useEffect(() => {
    const fetchPipelineStages = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/pipeline/group');
        const data = await response.json();
        
        if (data.success && data.stages && data.stages.length > 0) {
          // Map stages with default icons
          const stagesWithIcons = data.stages.map(stage => ({
            ...stage,
            icon: defaultGroupIcons[stage.id] || Clock
          }));
          setGroupPipelineStages(stagesWithIcons);

          // Update visible stages based on isVisible property
          const visibilityMap = {};
          data.stages.forEach(stage => {
            visibilityMap[stage.id] = stage.isVisible !== undefined ? stage.isVisible : true;
          });
          setVisibleStages(visibilityMap);
        }
      } catch (error) {
        console.error('Error fetching group pipeline stages:', error);
      }
    };

    fetchPipelineStages();
  }, [session?.user?.id]);

  const handleScheduleClick = (group) => {
    setSelectedGroup(group);
    setScheduleDialogOpen(true);
  };

  const handleGroupClick = (groupId) => {
    router.push(`/coach/group/${groupId}`);
  };

  const handleSettingsClick = (group) => {
    setSelectedGroupForSettings(group);
    setGroupSettingsOpen(true);
  };

  const handleStageMove = async (groupId, newStage) => {
    try {
      console.log(`Moving group ${groupId} to stage ${newStage}`);
      await updateGroupStage(groupId, newStage);
    } catch (error) {
      console.error('Error updating group stage:', error);
      // You could add a toast notification here to show the error to the user
    }
  };
  const filteredAndSortedGroups = groups
    .filter(group => {
      if (filterBy === 'all') return true;
      if (filterBy === 'active') return ['upcoming', 'ongoing'].includes(group.stage);
      if (filterBy === 'inactive') return ['completed', 'inactive'].includes(group.stage);
      return group.stage === filterBy;
    })
    .sort((a, b) => {
      let aValue;
      let bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'members':
          aValue = a.members;
          bValue = b.members;
          break;
        case 'nextSession':
          aValue = new Date(a.nextSession === 'Completed' || a.nextSession === 'On Hold' ? '1900-01-01' : a.nextSession + ' 2024').getTime();
          bValue = new Date(b.nextSession === 'Completed' || b.nextSession === 'On Hold' ? '1900-01-01' : b.nextSession + ' 2024').getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getStageGroups = (stageId) => {
    return filteredAndSortedGroups.filter(group => group.stage === stageId);
  };

  const getStageStats = (stageId) => {
    const stageGroups = groups.filter(group => group.stage === stageId);
    return {
      count: stageGroups.length,
      totalMembers: stageGroups.reduce((sum, group) => sum + group.members, 0)
    };
  };

  const renderGroupCard = (group) => {
    const stage = groupPipelineStages.find(s => s.id === group.stage);
    const StageIcon = stage?.icon || Clock;

    return (
      <Card 
        key={group.id} 
        className={`group card-hover cursor-pointer bg-background ${isMobile ? 'h-auto min-h-[120px]' : 'h-[140px]'} flex flex-col ${isMobile ? 'p-2' : ''}`}
        onClick={() => handleGroupClick(group.id)}
      >
        <CardContent className={`${isMobile ? 'p-2' : 'p-3'} flex-1 min-h-0`}>
          <div className={`flex items-start justify-between ${isMobile ? 'mb-1.5' : 'mb-2'}`}>
            <div className="flex-1 min-w-0">
              <div className={`flex items-center justify-between ${isMobile ? 'mb-1.5' : 'mb-2'}`}>
                <h3 className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'} text-foreground pr-2 line-clamp-2 leading-tight`}>{group.name}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${isMobile ? 'h-5 w-5' : 'h-6 w-6'} p-0 shrink-0`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel className="text-xs">Move To Stage</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {groupPipelineStages.map((stageOption) => (
                      <DropdownMenuItem
                        key={stageOption.id}
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStageMove(group.id, stageOption.id);
                        }}
                        disabled={stageOption.id === group.stage}
                      >
                        <stageOption.icon className="h-3 w-3 mr-2" />
                        {stageOption.id}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSettingsClick(group);
                      }}
                    >
                      <Settings className="h-3 w-3 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className={`flex gap-1 items-center ${isMobile ? 'mb-2' : 'mb-3'}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0 hover:bg-primary hover:text-primary-foreground relative`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/coach/group/${group.id}`);
                  }}
                >
                  <MessageCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  {group.unreadMessages > 0 && (
                    <span className={`absolute -top-1 -right-1 bg-red-500 text-white ${isMobile ? 'text-[10px] h-3 w-3' : 'text-xs rounded-full h-4 w-4'} flex items-center justify-center`}>
                      {group.unreadMessages}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  {group.lastComment ? (
                    <>
                      {group.lastComment.split(' ').slice(0, 15).join(' ')}
                      {group.lastComment.split(' ').length > 15 && '...'}
                    </>
                  ) : (
                    'No recent messages'
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0 hover:bg-accent hover:text-accent-foreground`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/coach/group/${group.id}`);
                  }}
                >
                  <StickyNote className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  {group.lastComment ? (
                    <>
                      {group.lastComment.split(' ').slice(0, 15).join(' ')}
                      {group.lastComment.split(' ').length > 15 && '...'}
                    </>
                  ) : (
                    'No recent messages'
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
            <div className={`flex items-center gap-1 ${isMobile ? 'ml-1' : 'ml-2'}`}>
              <Users2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{group.members}</span>
            </div>
          </div>
          <div className="mt-auto">
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} ${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
              <Calendar className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              <span>{group.nextSession}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''}`}>
      {/* Page Header */}
      <PageHeader 
        title={t('navigation.groups')} 
        subtitle={t('groups.title')}
      >
        {/* View Toggle */}
        <div className={`flex items-center ${isMobile ? 'gap-0.5' : 'gap-1'} rounded-lg border border-border bg-background ${isMobile ? 'p-0.5' : 'p-1'}`}>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size={isMobile ? "sm" : "sm"}
            onClick={() => setViewMode('list')}
            className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
          >
            <List className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-1'}`} />
            {!isMobile && "List"}
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size={isMobile ? "sm" : "sm"}
            onClick={() => setViewMode('cards')}
            className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
          >
            <LayoutGrid className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-1'}`} />
            {!isMobile && "Cards"}
          </Button>
        </div>
        
        <Button 
          className={`bg-gradient-primary text-[#1A2D4D] shadow-medium hover:shadow-strong transition-all ${isMobile ? 'text-xs px-2 h-8' : ''}`}
          onClick={() => setCreateGroupOpen(true)}
          size={isMobile ? "sm" : "default"}
        >
          <Plus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-2'}`} />
          {isMobile ? "New" : "Create New Group"}
        </Button>
      </PageHeader>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading groups...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">Error loading groups: {error}</p>
            <Button onClick={refetchGroups} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && groups.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">Create your first group to get started</p>
            <Button onClick={() => setCreateGroupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && groups.length > 0 && (
        <>
          {/* Controls */}
      <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2 pt-3' : 'gap-3 pt-4'} border-t border-border`}>
        {/* Filter & Columns Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`${isMobile ? 'gap-1 text-xs px-2 h-8' : 'gap-2'}`} size={isMobile ? "sm" : "default"}>
              <Filter className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              {isMobile ? "Filter" : "Filter and Columns"}
              <ChevronDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter Groups</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filterBy === 'all'}
              onCheckedChange={() => setFilterBy('all')}
            >
              Show All
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterBy === 'active'}
              onCheckedChange={() => setFilterBy('active')}
            >
              Active
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterBy === 'inactive'}
              onCheckedChange={() => setFilterBy('inactive')}
            >
              Inactive
            </DropdownMenuCheckboxItem>
            {viewMode === 'cards' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {groupPipelineStages.map((stage) => (
                  <DropdownMenuCheckboxItem
                    key={`column-${stage.id}`}
                    checked={visibleStages[stage.id]}
                    onCheckedChange={(checked) => 
                      setVisibleStages(prev => ({ ...prev, [stage.id]: checked }))
                    }
                  >
                    <stage.icon className="h-4 w-4 mr-2" />
                    {stage.id}
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
              Sort By
              <ChevronDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortBy === 'name'}
              onCheckedChange={() => setSortBy('name')}
            >
              Sort By Name
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'members'}
              onCheckedChange={() => setSortBy('members')}
            >
              Sort By Members
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'nextSession'}
              onCheckedChange={() => setSortBy('nextSession')}
            >
              Sort By Next Session
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? "Descending" : "Ascending"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Groups Display */}
      {viewMode === 'cards' ? (
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
          {groupPipelineStages
            .filter(stage => visibleStages[stage.id])
            .map((stage) => {
              const stageGroups = getStageGroups(stage.id);
              const stats = getStageStats(stage.id);
              const StageIcon = stage.icon;

              return (
                <Card key={stage.id} className={`shadow-soft border-border bg-card flex flex-col ${isMobile ? 'h-auto min-h-[400px] mb-4' : 'h-[600px]'} ${isMobile ? 'p-3' : ''}`}>
                  <CardHeader className={`pb-4 flex-shrink-0 ${isMobile ? 'pb-3 px-0' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                        <StageIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-muted-foreground`} />
                        <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-foreground`}>{stage.id}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={`${isMobile ? 'text-[10px] px-1 py-0' : 'text-xs'}`}>
                        {stats.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className={`flex-1 pt-0 ${isMobile ? 'pb-3 px-0' : 'pb-4'}`}>
                    <ScrollArea className={`h-full ${isMobile ? 'max-h-96' : ''}`}>
                      <div className={`space-y-3 ${isMobile ? 'space-y-2' : ''}`}>
                        {stageGroups.map((group) => renderGroupCard(group))}
                        {stageGroups.length === 0 && (
                          <div className={`text-center py-12 text-muted-foreground ${isMobile ? 'text-xs py-8' : 'text-sm'}`}>
                            No Groups In Stage
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card className={isMobile ? 'p-3' : ''}>
          {isMobile ? (
            <div className="space-y-3">
              {filteredAndSortedGroups.map((group) => {
                const stage = groupPipelineStages.find(s => s.id === group.stage);
                const StageIcon = stage?.icon || Clock;

                return (
                  <div
                    key={group.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => handleGroupClick(group.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold`}>{group.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} p-0`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel className={isMobile ? 'text-xs' : ''}>Move To Stage</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {groupPipelineStages.map((stageOption) => (
                            <DropdownMenuItem
                              key={stageOption.id}
                              className={isMobile ? 'text-xs' : ''}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStageMove(group.id, stageOption.id);
                              }}
                              disabled={stageOption.id === group.stage}
                            >
                              <stageOption.icon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                              {stageOption.id}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className={isMobile ? 'text-xs' : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSettingsClick(group);
                            }}
                          >
                            <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                            Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Stage: </span>
                        <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1 py-0' : ''}>
                          {group.stage}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Members: </span>
                        <span>{group.members}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Next Session: </span>
                        <span>{group.nextSession}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={isMobile ? 'h-7 w-7 p-0' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleClick(group);
                        }}
                      >
                        <Calendar className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={isMobile ? 'h-7 w-7 p-0' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/coach/group/${group.id}`);
                        }}
                      >
                        <MessageCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Next Session</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedGroups.map((group) => {
                  const stage = groupPipelineStages.find(s => s.id === group.stage);
                  const StageIcon = stage?.icon || Clock;

                  return (
                    <TableRow 
                      key={group.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleGroupClick(group.id)}
                  >
                    <TableCell>
                      <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                        <Users2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
                        <div>
                          <div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{group.name}</div>
                          <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground line-clamp-1`}>{group.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${stage?.color} text-white border-none ${isMobile ? 'text-[10px] px-1 py-0' : 'text-xs'}`}>
                        <StageIcon className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${isMobile ? 'mr-0.5' : 'mr-1'}`} />
                          {stage?.id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                        <div className="flex -space-x-1">
                          {group.avatars.slice(0, 3).map((initial, index) => (
                            <Avatar key={index} className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} border border-background`}>
                              <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.members > 3 && (
                            <div className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} rounded-full bg-muted border border-background flex items-center justify-center`}>
                              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                                +{group.members - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1 py-0' : 'text-xs'}>
                          {group.members}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {group.nextSession}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScheduleClick({ name: group.name, members: group.members });
                          }}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/coach/group/${group.id}`);
                          }}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Move To Stage</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {groupPipelineStages.map((stageOption) => (
                              <DropdownMenuItem
                                key={stageOption.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStageMove(group.id, stageOption.id);
                                }}
                                disabled={stageOption.id === group.stage}
                              >
                                <stageOption.icon className="h-4 w-4 mr-2" />
                                {stageOption.id}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleSettingsClick(group);
                            }}>
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </Card>
      )}

      {/* Dialogs */}
        </>
      )}

      <CreateGroupDialog 
        open={createGroupOpen} 
        onOpenChange={setCreateGroupOpen}
        onGroupCreated={refetchGroups}
      />
      
      {selectedGroup && (
        <ScheduleSessionDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          groupName={selectedGroup.name}
          groupMembers={selectedGroup.members}
        />
      )}

      <GroupSettingsDialog
        open={groupSettingsOpen}
        onOpenChange={setGroupSettingsOpen}
        group={selectedGroupForSettings}
      />

    </div>
  );
}
