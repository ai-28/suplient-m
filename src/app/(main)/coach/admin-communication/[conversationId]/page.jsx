"use client"

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { UniversalChatInterface } from "@/app/components/UniversalChatInterface";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/app/components/PageHeader";
import { Card, CardContent } from "@/app/components/ui/card";
import { useCoachAdminConversationId } from "@/app/hooks/useCoachAdminConversationId";

export default function AdminConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const conversationIdFromParams = params.conversationId;
  
  // Use hook to get conversation ID (same pattern as client-coach)
  const { conversationId, loading: conversationLoading } = useCoachAdminConversationId();
  
  // Use conversationId from hook or fallback to params
  const activeConversationId = conversationId || conversationIdFromParams;

  if (conversationLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!activeConversationId) {
    return (
      <div className="page-container">
        <PageHeader title="Conversation Not Found" />
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground mb-4">Unable to load conversation.</p>
            <Button onClick={() => router.push('/coach/admin-communication')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Communication
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/coach/admin-communication')}
          className="mb-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title="Chat with Admin"
          subtitle="Admin communication"
        />
      </div>

      <Card className="h-[calc(100vh-200px)]">
        <CardContent className="p-0 h-full">
          <UniversalChatInterface
            chatId={activeConversationId}
            chatType="admin_coach"
            participantName="Admin"
            participantInitials="A"
            currentUserId={session?.user?.id}
            currentUserRole="coach"
            title="Admin"
            className="h-full rounded-none border-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
