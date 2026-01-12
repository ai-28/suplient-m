"use client"
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Users, Calendar, MessageCircle, TrendingUp, Clock } from "lucide-react";

export function GroupOverviewModal({ 
  open, 
  onOpenChange, 
  groupData,
  className = "" 
}) {
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);
  const handleJoinChat = () => {
    onOpenChange(false);
    // Navigate to group chat - this will be handled by parent component
    window.location.href = `/client/group/${groupData?.id}?groupName=${encodeURIComponent(groupData?.name)}`;
  };

  if (!groupData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? 'max-w-full mx-2' : 'max-w-md mx-4 sm:mx-0'}>
        <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
          <DialogTitle className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold break-words`}>{groupData.name}</DialogTitle>
        </DialogHeader>

        <div className={`${isMobile ? 'space-y-3 px-4' : 'space-y-4'}`}>
          {/* Group Description */}
          {groupData.description && (
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>
              {groupData.description}
            </div>
          )}

          {/* Group Stats */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>
            <div className="flex items-center gap-2">
              <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium break-words`}>{groupData.members || 0}</p>
                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium break-words`}>{groupData.attendance || 0}%</p>
                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Attendance</p>
              </div>
            </div>
          </div>

          {/* Group Members Preview - Show member count and online status */}
          <div>
            <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2 break-words`}>Group Info</h4>
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <div className="flex items-center gap-2">
                <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} break-words`}>{groupData.members || 0} members</span>
              </div>
              {groupData.maxMembers && (
                <div className="flex items-center gap-2">
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>
                    Capacity: {groupData.members}/{groupData.maxMembers}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Group Tags */}
          <div>
            <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2 break-words`}>Focus Areas</h4>
            <div className="flex flex-wrap gap-1">
              {groupData.focusArea && (
                <Badge variant="outline" className={isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'}>
                  {groupData.focusArea}
                </Badge>
              )}
              {groupData.stage && (
                <Badge variant="outline" className={isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'}>
                  {groupData.stage}
                </Badge>
              )}
            </div>
          </div>

          {/* Next Session */}
          {groupData.nextSession && (
            <div className={`flex items-center gap-2 ${isMobile ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
              <Calendar className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium break-words`}>Next Session</p>
                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>{groupData.nextSession}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'} ${isMobile ? 'pt-2' : 'pt-2'}`}>
            <Button 
              onClick={handleJoinChat}
              className={isMobile ? 'w-full' : 'flex-1'}
              size={isMobile ? "sm" : "sm"}
            >
              <MessageCircle className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              Open Chat
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              size={isMobile ? "sm" : "sm"}
              className={isMobile ? 'w-full text-xs h-8' : ''}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
