"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ChevronLeft, ChevronRight, FileText, CheckSquare, MessageSquare, ClipboardCheck, Plus, Upload } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';

const ELEMENT_COLORS = {
  content: 'bg-blue-500',
  task: 'bg-green-500',
  message: 'bg-orange-500',
  checkin: 'bg-purple-500'
};

const ELEMENT_TYPES = {
  content: 'Content',
  task: 'Task',
  message: 'Message',
  checkin: 'Check-in'
};

const ELEMENT_ICONS = {
  content: FileText,
  task: CheckSquare,
  message: MessageSquare,
  checkin: ClipboardCheck
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ProgramFlowChart({ elements, duration, highlightedElementId, onElementClick, onAddElementToDay, onDayClick, selectedDay, forceCloseDropdowns = false }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  console.log("elements", elements)

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

  // Close dropdowns when forceCloseDropdowns is true
  useEffect(() => {
    if (forceCloseDropdowns) {
      setOpenDropdown(null);
    }
  }, [forceCloseDropdowns]);
  // Group elements by week and day (filtered to current 4-week view)
  const weeklyData = React.useMemo(() => {
    const weeks = [];
    const currentWeekEnd = Math.min(currentWeekStart + 3, duration);
    
    for (let week = currentWeekStart; week <= currentWeekEnd; week++) {
      const weekStart = (week - 1) * 7 + 1;
      const weekEnd = week * 7;
      const days = [];
      for (let day = weekStart; day <= weekEnd; day++) {
        const dayElements = elements.filter(el => el.scheduledDay === day);
        const dayOfWeek = ((day - 1) % 7);

        days.push({
          day,
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          elements: dayElements.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
        });
      }
      console.log("days", days)
      
      weeks.push({
        week,
        days,
        elementCount: days.reduce((count, day) => count + day.elements.length, 0)
      });
      console.log(weeks)
    }
    
    return weeks;
  }, [elements, duration, currentWeekStart]);

  const totalElements = elements.length;
  const currentWeekEnd = Math.min(currentWeekStart + 3, duration);
  const currentViewElements = weeklyData.reduce((count, week) => count + week.elementCount, 0);
  
  const canGoPrevious = currentWeekStart > 1;
  const canGoNext = currentWeekEnd < duration;
  const handlePreviousWeeks = () => {
    setCurrentWeekStart(Math.max(1, currentWeekStart - 4));
  };
  
  const handleNextWeeks = () => {
    setCurrentWeekStart(Math.min(duration - 3, currentWeekStart + 4));
  };

  return (
    <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
      <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : 'pb-3'}>
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
          <div className="flex-1 min-w-0">
            <CardTitle className={`${isMobile ? 'text-sm' : 'text-lg'} break-words`}>Program Flow Overview</CardTitle>
            <CardDescription className={isMobile ? 'text-xs mt-0.5' : ''}>
              <span className="break-words">Weeks {currentWeekStart}-{currentWeekEnd} of {duration}</span>
              <span className={isMobile ? 'block' : ''}> • {currentViewElements} of {totalElements} elements</span>
            </CardDescription>
          </div>
          {duration > 4 && (
            <div className={`flex items-center ${isMobile ? 'gap-1 w-full' : 'gap-2'}`}>
              <Button 
                variant="outline" 
                size={isMobile ? "sm" : "sm"}
                onClick={handlePreviousWeeks}
                disabled={!canGoPrevious}
                className={isMobile ? 'flex-1 text-xs h-7' : ''}
              >
                <ChevronLeft className={isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'} />
                {isMobile ? 'Prev' : 'Previous Month'}
              </Button>
              <Button 
                variant="outline" 
                size={isMobile ? "sm" : "sm"}
                onClick={handleNextWeeks}
                disabled={!canGoNext}
                className={isMobile ? 'flex-1 text-xs h-7' : ''}
              >
                {isMobile ? 'Next' : 'Next Month'}
                <ChevronRight className={isMobile ? 'h-3 w-3 ml-0.5' : 'h-4 w-4 ml-1'} />
              </Button>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className={`flex flex-wrap ${isMobile ? 'gap-2 pt-1' : 'gap-4 pt-2'}`}>
          {Object.entries(ELEMENT_TYPES).map(([type, label]) => {
            const count = elements.filter(el => el.type === type).length;
            const Icon = ELEMENT_ICONS[type];
            
            return (
              <div key={type} className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                <div className={cn(`${isMobile ? 'w-2 h-2' : 'w-3 h-3'} rounded-full`, ELEMENT_COLORS[type])} />
                <Icon className={isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium break-words`}>{label}</span>
                <Badge variant="outline" className={isMobile ? 'text-[10px] px-1' : 'text-xs'}>
                  {count}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
        <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
          {weeklyData.map(({ week, days, elementCount }) => (
            <div key={week} className={isMobile ? 'space-y-2' : 'space-y-3'}>
              {/* Week Header */}
              <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : 'justify-between'}`}>
                <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-foreground break-words`}>
                  Week {week}
                </h3>
                <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1' : 'text-xs'}>
                  {elementCount} {elementCount === 1 ? 'element' : 'elements'}
                </Badge>
              </div>
              
              {/* Days Grid - Responsive: 7 cols on desktop, 2 cols on mobile */}
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-7'} ${isMobile ? 'gap-1.5' : 'gap-2'} overflow-x-auto`}>
                {days.map(({ day, dayOfWeek, dayName, elements: dayElements }) => {
                  const isSelected = selectedDay === day;
                  return (
                  <div
                    key={day}
                    onClick={() => onDayClick && onDayClick(day)}
                    className={cn(
                      `${isMobile ? 'min-h-[100px] p-1.5' : 'min-h-[80px] p-2'} border rounded-lg bg-card relative group transition-all`,
                      isSelected 
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20" 
                        : dayElements.length > 0 
                          ? "border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 cursor-pointer" 
                          : "border-dashed hover:border-primary/40 hover:bg-primary/10 cursor-pointer",
                      onDayClick && "cursor-pointer"
                    )}
                  >
                    {/* Day Header */}
                    <div className={`${isMobile ? 'text-[10px] mb-1' : 'text-xs mb-2'} font-medium text-muted-foreground`}>
                      <div className="break-words">{dayName}</div>
                      <div className={cn(
                        isMobile ? 'text-[9px]' : 'text-[10px]',
                        onDayClick && dayElements.length > 0 && "text-primary font-semibold"
                      )}>
                        Day {day}
                        {onDayClick && dayElements.length > 0 && (
                          <span className="ml-1 text-[8px] opacity-70">(click to preview)</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Add Element Button */}
                    {onAddElementToDay && (
                      <div className={`absolute ${isMobile ? 'top-0.5 right-0.5' : 'top-1 right-1'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <DropdownMenu 
                          open={openDropdown === `${week}-${dayOfWeek}`}
                          onOpenChange={(open) => setOpenDropdown(open ? `${week}-${dayOfWeek}` : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={isMobile ? 'h-5 w-5 p-0 hover:bg-primary/20' : 'h-6 w-6 p-0 hover:bg-primary/20'}
                            >
                              <Plus className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={isMobile ? 'w-36' : 'w-40'}>
                            <DropdownMenuItem onClick={() => onAddElementToDay(dayOfWeek + 1, week, 'content')} className={isMobile ? 'text-xs' : ''}>
                              <Upload className={isMobile ? 'h-3 w-3 mr-1.5' : 'h-4 w-4 mr-2'} />
                              Share File
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddElementToDay(dayOfWeek + 1, week, 'task')} className={isMobile ? 'text-xs' : ''}>
                              <CheckSquare className={isMobile ? 'h-3 w-3 mr-1.5' : 'h-4 w-4 mr-2'} />
                              Create Task
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddElementToDay(dayOfWeek + 1, week, 'message')} className={isMobile ? 'text-xs' : ''}>
                              <MessageSquare className={isMobile ? 'h-3 w-3 mr-1.5' : 'h-4 w-4 mr-2'} />
                              Send Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    
                    {/* Elements */}
                    <div className={isMobile ? 'space-y-0.5' : 'space-y-1'}>
                      {dayElements.map((element) => {
                        const Icon = ELEMENT_ICONS[element.type];
                        const isCoachTask = element.type === 'task' && element.data?.assignedTo === 'coach';
                        
                        return (
                          <div
                            key={element.id}
                            className={cn(
                              `${isMobile ? 'text-[10px] p-1' : 'text-xs p-1.5'} rounded cursor-pointer transition-all hover:scale-105 hover:shadow-sm relative`,
                              ELEMENT_COLORS[element.type],
                              "text-white",
                              highlightedElementId === element.id ? 'ring-2 ring-yellow-400 animate-pulse scale-110' : ''
                            )}
                            onClick={() => onElementClick?.(element)}
                            title={`${element.title || ELEMENT_TYPES[element.type]}${isCoachTask ? ' (Coach Task)' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <Icon className={isMobile ? 'w-2.5 h-2.5 flex-shrink-0' : 'w-3 h-3 flex-shrink-0'} />
                              {isCoachTask && (
                                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-yellow-300 border border-yellow-500`} title="Coach Task" />
                              )}
                            </div>
                            <div className={`mt-0.5 ${isMobile ? 'text-[9px]' : 'text-[10px]'} leading-tight break-words`}>
                              {element.title || ELEMENT_TYPES[element.type]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}