"use client"
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { GroupChatInterface } from "@/app/components/GroupChatInterface";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/app/context/LanguageContext";

export default function GroupChat() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslation();
  const groupId = params?.id; // Changed from groupId to id to match route
  const groupName = searchParams?.get('groupName') || t('groups.groupChat', 'Group Chat');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!groupId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/groups/${groupId}/members`);
        if (!response.ok) {
          throw new Error('Failed to fetch group members');
        }
        const data = await response.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Error fetching group members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [groupId]);

  if (!groupId) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        {t('groups.invalidGroupId', 'Invalid Group ID')}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Chat interface with integrated header */}
      <GroupChatInterface
        groupId={groupId}
        groupName={groupName}
        members={members} 
        activeMembers={members.length}
        className="h-full"
        showBackButton={true}
        backButtonAction={() => router.push('/client/sessions')}
      />
    </div>
  );
}