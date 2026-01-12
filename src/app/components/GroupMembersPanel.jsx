"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { 
  Users,
  MessageCircle,
  Phone,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Clock,
  UserPlus
} from "lucide-react";
export function GroupMembersPanel({ members, onMessageMember, onMemberClick, groupId }) {
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
  
  // Convert pending membership requests to member objects for unified display
  const pendingRequests = groupId ? [] : [];
  const pendingMembers = pendingRequests.map(req => ({
    id: parseInt(req.id.replace(/\D/g, '')) || 0, // Extract number from request ID
    name: req.clientName,
    initials: req.clientName.split(' ').map(n => n[0]).join(''),
    status: "on-hold",
    joinDate: new Date(req.timestamp).toLocaleDateString(),
    attendance: "0%",
    requestId: req.id,
    requestType: req.requestType,
    message: req.message
  }));

  // Combine actual members with pending requests
  const allMembers = [...members, ...pendingMembers];
  const activeMembers = allMembers.filter(m => m.status === "active");
  const inactiveMembers = allMembers.filter(m => m.status === "inactive");
  const onHoldMembers = allMembers.filter(m => m.status === "on-hold");

  const getAttendanceColor = (attendance) => {
    const rate = parseInt(attendance);
    if (rate >= 90) return "text-success bg-success/10 border-success/20";
    if (rate >= 75) return "text-warning bg-warning/10 border-warning/20";
    return "text-destructive bg-destructive/10 border-destructive/20";
  };

  const calculateAverageAttendance = () => {
    const activeWithAttendance = activeMembers.filter(m => m.attendance && m.attendance !== "0%");
    if (activeWithAttendance.length === 0) return 0;
    const total = activeWithAttendance.reduce((sum, member) => sum + parseInt(member.attendance), 0);
    return Math.round(total / activeWithAttendance.length);
  };

  const handleApproveRequest = (requestId) => {
    // approveRequest(requestId);
  };

  const handleDeclineRequest = (requestId) => {
    //  declineRequest(requestId);
  };

  return (
    <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
      {/* Member Statistics Overview */}
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : 'pb-3'}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-lg'}`}>
            <TrendingUp className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            Member Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2 pb-2 pt-0' : 'pt-0'}>
          <div className={`grid grid-cols-4 ${isMobile ? 'gap-1' : 'gap-3'}`}>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-2'} bg-success/5 rounded-lg border border-success/20`}>
              <div className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-success`}>{activeMembers.length}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Active</div>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-2'} bg-muted/5 rounded-lg border border-muted/20`}>
              <div className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-muted-foreground`}>{inactiveMembers.length}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Inactive</div>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-2'} bg-warning/5 rounded-lg border border-warning/20`}>
              <div className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-warning`}>{onHoldMembers.length}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>On Hold</div>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-2'} bg-primary/5 rounded-lg border border-primary/20`}>
              <div className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-primary`}>{allMembers.length}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Total</div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Active Members and On Hold side-by-side */}
      <div className={`grid grid-cols-1 ${isMobile ? '' : 'lg:grid-cols-2'} ${isMobile ? 'gap-2' : 'gap-4'}`}>
        {/* Active Members - takes 50% of the space */}
        <div>
          <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
            <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-lg'}`}>
                <CheckCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                <span className="break-words">Active Members ({activeMembers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
              <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[250px]'}`}>
                <div className={`${isMobile ? 'space-y-2 pr-2' : 'space-y-3 pr-4'}`}>
                  {activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} ${isMobile ? 'p-2' : 'p-3'} border border-border rounded-lg hover:bg-accent/5 transition-all cursor-pointer gap-2`}
                    onClick={() => onMemberClick?.(member.id.toString(), member.name)}
                  >
                    <div className={`flex items-center ${isMobile ? 'w-full' : 'gap-3'} min-w-0`}>
                      <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} border-2 border-primary/20`}>
                        {member.avatar && (
                          <AvatarImage 
                            src={member.avatar} 
                            alt={member.name} 
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>{member.name}</p>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Joined {member.joinDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* On Hold - Pending Approval - takes 50% of the space */}
        {onHoldMembers.length > 0 && (
          <div>
            <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
              <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-lg'}`}>
                  <Clock className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  <span className="break-words">On Hold ({onHoldMembers.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
                <ScrollArea className={isMobile ? 'h-[200px]' : 'h-[300px]'}>
                  <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                    {onHoldMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex flex-col ${isMobile ? 'gap-1' : 'gap-2'} ${isMobile ? 'p-2' : 'p-3'} border border-border rounded-lg bg-warning/5 border-warning/20 cursor-pointer hover:bg-warning/10 transition-all`}
                        onClick={() => !member.requestId && onMemberClick?.(member.id.toString(), member.name)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} border-2 border-warning/30`}>
                            {member.avatar && (
                              <AvatarImage 
                                src={member.avatar} 
                                alt={member.name} 
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className={`bg-warning/10 text-warning ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>
                              {member.name}
                            </p>
                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                              {member.requestId ? (
                                member.requestType === "invitation" ? "Invited" : "Requested"
                              ) : (
                                "On hold"
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {member.message && (
                          <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground italic bg-muted/20 ${isMobile ? 'p-1' : 'p-2'} rounded break-words`}>
                            "{member.message}"
                          </p>
                        )}
                        
                        {member.requestId && (
                          <div className={`flex ${isMobile ? 'flex-col' : 'flex-col'} ${isMobile ? 'gap-1' : 'gap-1'}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={`${isMobile ? 'h-6 text-[10px]' : 'h-7 text-xs'} bg-success/10 border-success/30 text-success hover:bg-success/20 w-full`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveRequest(member.requestId);
                              }}
                            >
                              <UserCheck className={isMobile ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'} />
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={`${isMobile ? 'h-6 text-[10px]' : 'h-7 text-xs'} bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 w-full`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineRequest(member.requestId);
                              }}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
          <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-lg'}`}>
              <UserCheck className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              <span className="break-words">Inactive Members ({inactiveMembers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
            <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[250px]'}`}>
              <div className={`${isMobile ? 'space-y-2 pr-2' : 'space-y-3 pr-4'}`}>
                {inactiveMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} ${isMobile ? 'p-2' : 'p-3'} border border-border rounded-lg bg-muted/20 opacity-60 gap-2`}
                  >
                    <div className={`flex items-center ${isMobile ? 'w-full' : 'gap-3'} min-w-0`}>
                      <Avatar 
                        className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} border-2 border-muted/30 cursor-pointer hover:border-muted/50 transition-colors`}
                        onClick={() => onMemberClick?.(member.id.toString(), member.name)}
                      >
                        {member.avatar && (
                          <AvatarImage 
                            src={member.avatar} 
                            alt={member.name} 
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className={`bg-muted text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className={`cursor-pointer hover:text-primary transition-colors flex-1 min-w-0 ${isMobile ? 'w-full' : ''}`}
                        onClick={() => onMemberClick?.(member.id.toString(), member.name)}
                      >
                        <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>{member.name}</p>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Joined {member.joinDate}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                      <Badge variant="outline" className={`${isMobile ? 'text-[10px]' : 'text-xs'} border-muted/50 text-muted-foreground bg-muted/10`}>
                        Inactive
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={isMobile ? 'h-6 w-6' : 'h-6 w-6'}
                        onClick={() => onMessageMember(member.id)}
                      >
                        <MessageCircle className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
