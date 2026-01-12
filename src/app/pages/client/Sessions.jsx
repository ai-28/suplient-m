"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Users, MessageCircle, Lock, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UniversalChatInterface } from "@/app/components/UniversalChatInterface";
import { GroupChatInterface } from "@/app/components/GroupChatInterface";
import { useSession } from "next-auth/react";
import { useClientCoach } from "@/app/hooks/useClientCoach";
import { useConversationId } from "@/app/hooks/useConversationId";
import { useGroups } from "@/app/hooks/useGroups";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/app/context/LanguageContext";

export default function ClientSessions() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslation();
  
  // Get client's coach and conversation ID
  const { coach, loading: coachLoading, error: coachError } = useClientCoach();
  console.log('🔍 Client Sessions - Coach data:', { coach, coachLoading, coachError });
  const { conversationId, loading: conversationLoading } = useConversationId(
    session?.user?.id,
    coach?.id
  );
  
  // Get groups from database
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  
  // Get joined groups (only groups the client is actually a member of)
  const joinedGroups = groups.filter(group => group.isJoined);
  
  // Check group subscription status
  const [hasGroupSubscription, setHasGroupSubscription] = useState(false);
  const [checkingGroupSubscription, setCheckingGroupSubscription] = useState(true);

  useEffect(() => {
    const checkGroupSubscription = async () => {
      if (!session?.user?.id) {
        setCheckingGroupSubscription(false);
        return;
      }

      try {
        const response = await fetch('/api/client/subscriptions/check?productType=group');
        if (response.ok) {
          const data = await response.json();
          setHasGroupSubscription(data.hasActiveSubscription || false);
        }
      } catch (error) {
        console.error('Error checking group subscription:', error);
        setHasGroupSubscription(false);
      } finally {
        setCheckingGroupSubscription(false);
      }
    };

    checkGroupSubscription();
  }, [session?.user?.id]);
  
  const handleOpenGroupChat = (groupId, groupName) => {
    router.push(`/client/group/${groupId}?groupName=${encodeURIComponent(groupName)}`);
  };

  const ChatTab = () => {
    if (coachLoading || conversationLoading) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (!coach) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
          <div className="text-center">
            <p>{t('sessions.noCoach', 'No coach assigned')}</p>
            {coachError && (
              <p className="text-sm text-red-500 mt-2">{t('common.messages.error', 'Error')}: {coachError}</p>
            )}
          </div>
        </div>
      );
    }

    if (!conversationId) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
          {t('sessions.unableToLoadChat', 'Unable to load chat')}
        </div>
      );
    }

    return (
      <UniversalChatInterface
        chatId={conversationId}
        chatType="personal"
        participantName={coach.name}
        participantInitials={coach.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        participantAvatar={coach.avatar || null}
        currentUserId={session?.user?.id}
        currentUserRole="client"
        allowScheduling={true}
        title={coach.name}
        className="h-[calc(100vh-100px)] rounded-none border-none"
      />
    );
  };

  const GroupsTab = () => {
    if (groupsLoading || checkingGroupSubscription) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (groupsError) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-100px)] text-muted-foreground">
          {t('sessions.errorLoadingGroups', 'Error loading groups')}: {groupsError}
        </div>
      );
    }

    // If no group subscription and user has joined groups, show subscription prompt
    if (!hasGroupSubscription && joinedGroups.length > 0) {
      return (
        <div className="p-3 sm:p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Group Subscription Required
              </CardTitle>
              <CardDescription>
                You need an active group subscription to access group chats.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Subscribe to your coach's group service to access group chats and sessions.
              </p>
              <Button 
                onClick={() => router.push('/client/profile?tab=billing')}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Go to Billing & Subscribe
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // If user is member of exactly one group, show group chat directly (subscription check is in GroupChatInterface)
    if (joinedGroups.length === 1) {
      const group = joinedGroups[0];
      return (
        <GroupChatInterface
          groupId={group.id}
          groupName={group.name}
          members={[]} // Empty array - GroupChatInterface will fetch members with avatars
          activeMembers={group.members} // Use actual member count
        />
      );
    }

    // If multiple groups or no groups, show selection interface
    return (
      <div className="p-3 sm:p-4 space-y-4">
        {joinedGroups.length > 0 ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold">{t('groups.yourGroups', 'Your Groups')}</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/client/groups')}
                className="w-full sm:w-auto"
              >
                {t('groups.browseAll', 'Browse All Groups')}
              </Button>
            </div>
            
            <div className="space-y-3">
              {joinedGroups.map((group) => (
                <Card key={group.id} className="bg-primary/5 border-primary/20 hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                            {group.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm sm:text-base truncate">{group.name}</p>
                            {group.unreadMessages > 0 && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                {group.unreadMessages}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{group.description}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span>{group.members}/{group.maxMembers || '∞'} members</span>
                            </div>
                            <Badge variant="outline" className="text-xs w-fit">
                              {group.focusArea || 'General'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleOpenGroupChat(group.id, group.name)}
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                        size="sm"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {t('groups.openChat', 'Open Chat')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold mb-2">{t('groups.noMemberships', 'No Group Memberships')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md">
              {t('groups.noMembershipsDesc', "You are not a member of any group yet. Consult with your coach/therapist to learn more about group sessions.")}
            </p>
            <Button onClick={() => router.push('/client/groups')} className="w-full sm:w-auto">
              {t('groups.browseAvailable', 'Browse Available Groups')}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <Tabs defaultValue="chat" className="h-full flex flex-col">
        {/* Tab Headers - Fixed at top */}
        <div className="border-b border-border bg-card fixed top-safe left-0 right-0 z-50 safe-x">
          <TabsList className="w-full grid grid-cols-2 h-12 bg-transparent p-0">
            <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              1-1
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              {t('navigation.groups')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content - Adjusted for fixed header */}
        <div className="flex-1 pt-12 safe-x" style={{ 
          paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(93px + env(safe-area-inset-bottom, 0px))'
        }}>
          <TabsContent value="chat" className="mt-0 h-[calc(100vh-48px)]">
            <ChatTab />
          </TabsContent>
          
          <TabsContent value="groups" className="mt-0 h-full">
            <GroupsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}