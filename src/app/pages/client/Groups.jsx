"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { ArrowLeft, Users, MessageCircle, Calendar, Plus, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MembershipRequestDialog } from "@/app/components/MembershipRequestDialog";
import { useGroups } from "@/app/hooks/useGroups";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/app/context/LanguageContext";


function ClientGroupsComponent() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslation();
  const [filter, setFilter] = useState("all");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Get groups from database
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  
  // Check if user has pending request for a group (TODO: Implement with real API)
  const hasPendingRequest = (groupId) => {
    // For now, always return false since we don't have real membership request data
    return false;
  };

  const filteredGroups = groups.filter(group => {
    if (filter === "joined") return group.isJoined;
    if (filter === "available") return !group.isJoined;
    return true;
  });

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (groupsError) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => router.push('/client')}>
            <ArrowLeft className="h-5 w-5" />
          </Button> 
          <h1 className="ml-4 text-xl font-semibold">{t('groups.supportCircles', 'Support Circles')}</h1>
        </div>

        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center p-6">
            <div className="text-red-500 mb-4">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-medium">{t('groups.connectionError', 'Connection Error')}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('groups.unableToLoad', 'Unable to load groups. This might be a temporary network issue.')}
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                {t('common.buttons.tryAgain', 'Try Again')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/client')}
                className="w-full"
              >
                {t('sessions.backToSessions', 'Back to Sessions')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleJoinGroup = (group) => {
    if (group.groupType === "open") {
      setSelectedGroup(group);
      setRequestDialogOpen(true);
    } else {
      // For invite-only groups, show a message that they need an invitation
    }
  };

  const handleOpenChat = (groupId, groupName) => {
    router.push(`/client/group/${groupId}?groupName=${encodeURIComponent(groupName)}`);
  };

  const handleJoinSession = async (groupId, groupName) => {
    try {
      // Fetch the latest session for this group
      const response = await fetch(`/api/groups/${groupId}/sessions/latest`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.session) {
        // No active session available
        // Using toast instead of alert for better UX
        const { toast } = await import('sonner');
        toast.error(t('groups.noActiveSession', `No active session available for ${groupName}. Please check back later or contact your coach.`));
        return;
      }
      
      if (!data.session.meetingUrl) {
        // Session exists but no meeting link
        const { toast } = await import('sonner');
        toast.error(t('groups.noMeetingLink', `Session "${data.session.title}" is scheduled but no meeting link is available yet. Please contact your coach.`));
        return;
      }
      
      // Open the meeting URL in a new tab
      window.open(data.session.meetingUrl, '_blank');
      
    } catch (error) {
      console.error('Error joining session:', error);
      const { toast } = await import('sonner');
      toast.error(t('groups.joinSessionError', `Unable to join session for ${groupName}. Please try again or contact your coach.`));
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center p-3 sm:p-4 border-b border-border bg-card flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/client')}>
          <ArrowLeft className="h-5 w-5" />
        </Button> 
        <h1 className="ml-4 text-lg sm:text-xl font-semibold">{t('groups.supportCircles', 'Support Circles')}</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 pb-32 space-y-4 sm:space-y-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1 sm:flex-none"
          >
            {t('groups.allGroups', 'All Groups')}
          </Button>
          <Button
            variant={filter === "joined" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("joined")}
            className="flex-1 sm:flex-none"
          >
            {t('groups.myGroups', 'My Groups')}
          </Button>
          <Button
            variant={filter === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("available")}
            className="flex-1 sm:flex-none"
          >
            {t('groups.available', 'Available')}
          </Button>
        </div>

        {/* Groups List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <CardTitle className="text-base sm:text-lg truncate">{group.name}</CardTitle>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {group.isJoined && (
                          <Badge variant="secondary" className="text-xs">{t('groups.joined', 'Joined')}</Badge>
                        )}
                        {group.unreadMessages > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {group.unreadMessages}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-sm mb-3 line-clamp-2">{group.description}</CardDescription>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{group.members}/{group.maxMembers || '∞'} members</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {group.focusArea || 'General'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {group.stage}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Badge variant="outline" className="w-fit">{group.focusArea || 'General'}</Badge>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {group.isJoined ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenChat(group.id, group.name)}
                          className="w-full sm:w-auto"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {t('groups.chat', 'Chat')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="w-full sm:w-auto">
                              <Calendar className="h-4 w-4 mr-2" />
                              {t('groups.joinSession', 'Join Session')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 sm:mx-0">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('groups.joinSessionTitle', 'Join {name} Session', { name: group.name })}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('groups.joinSessionDesc', "You're about to join a session for {name}. Make sure you're in a quiet, private space for the best experience.", { name: group.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto">{t('common.buttons.cancel')}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleJoinSession(group.id, group.name)}
                                className="w-full sm:w-auto"
                              >
                                {t('groups.joinSession', 'Join Session')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleJoinGroup(group)}
                        disabled={group.maxMembers && group.members >= group.maxMembers || hasPendingRequest(group.id)}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {group.maxMembers && group.members >= group.maxMembers 
                          ? t('groups.full', "Full")
                          : hasPendingRequest(group.id)
                            ? t('groups.requestPending', "Request Pending")
                            : t('groups.requestToJoin', "Request to Join")
                        }
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="pt-6 p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">
                  {filter === "joined" ? t('groups.noJoined', "No Joined Groups") : t('groups.noAvailable', "No Groups Available")}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  {filter === "joined" 
                    ? t('groups.noJoinedDesc', "You haven't joined any support circles yet.")
                    : t('groups.noMatchFilter', "No groups match your current filter.")
                  }
                </p>
                {filter === "joined" && (
                  <Button 
                    onClick={() => setFilter("available")}
                    className="w-full sm:w-auto"
                  >
                    {t('groups.browseAvailable', 'Browse Available Groups')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Membership Request Dialog */}
        <MembershipRequestDialog
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          group={selectedGroup}
          clientId={session?.user?.id}
          clientName={session?.user?.name}
          clientEmail={session?.user?.email}
        />
        </div>
      </div>
    </div>
  );
}

export default ClientGroupsComponent;