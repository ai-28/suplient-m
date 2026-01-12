"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Separator } from "@/app/components/ui/separator";
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin
} from "lucide-react";

export function GroupInfoPanel({ group }) {
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
  const renderSessionDots = () => {
    const dots = [];
    for (let i = 0; i < group.totalSessions; i++) {
      const isCompleted = i < group.completedSessions;
      dots.push(
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${
            isCompleted ? 'bg-green-500' : 'bg-yellow-400'
          }`}
        />
      );
    }
    return dots;
  };

  return (
    <Card className={`${isMobile ? 'p-0 shadow-none border-0' : 'shadow-soft border-border'} bg-card`}>
      <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : 'pb-3'}>
        <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-lg'} font-medium text-foreground`}>
          <Users className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
          Group Details
        </CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
        <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[250px]'}`}>
          <div className={`${isMobile ? 'space-y-3 pr-2' : 'space-y-6 pr-4'}`}>
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <Calendar className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground font-medium break-words`}>{group.nextSession}</p>
                  <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Next Session</p>
                </div>
              </div>
              
              <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <Clock className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground font-medium break-words`}>{group.frequency} • {group.duration}</p>
                  <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Schedule & Duration</p>
                </div>
              </div>
              
              <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <MapPin className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                <div className="flex-1 min-w-0">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground font-medium break-words`}>{group.location}</p>
                  <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>Meeting Location</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground font-medium ${isMobile ? 'mb-1' : 'mb-2'} break-words`}>Sessions: {group.completedSessions} of {group.totalSessions} completed</p>
                <div className={`flex flex-wrap ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                  {renderSessionDots()}
                </div>
              </div>
              <div className={`flex justify-between items-center ${isMobile ? 'flex-wrap gap-1' : ''}`}>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground break-words`}>Started</span>
                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>{group.startDate}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
