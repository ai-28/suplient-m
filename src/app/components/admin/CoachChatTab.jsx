"use client"

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { UniversalChatInterface } from "@/app/components/UniversalChatInterface";
import { useAdminCoachConversationId } from "@/app/hooks/useAdminCoachConversationId";

export function CoachChatTab({ coachId, coachName }) {
  const { data: session } = useSession();
  
  // Get conversation ID using the hook (same pattern as client-coach)
  const conversationParams = useMemo(() => ({
    adminId: session?.user?.id,
    coachId: coachId
  }), [session?.user?.id, coachId]);

  const { conversationId, loading: conversationLoading } = useAdminCoachConversationId(
    conversationParams.adminId,
    conversationParams.coachId
  );

  if (conversationLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        Unable to load chat
      </div>
    );
  }

  return (
    <div className="h-[600px] border rounded-lg overflow-hidden">
      <UniversalChatInterface 
        chatId={conversationId}
        chatType="admin_coach"
        participantName={coachName}
        participantInitials={coachName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'C'}
        participantAvatar={null}
        currentUserId={session?.user?.id}
        currentUserRole="admin"
        title={coachName}
        className="h-full rounded-none border-none"
      />
    </div>
  );
}
