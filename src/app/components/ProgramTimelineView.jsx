"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  Circle, 
  Clock, 
  FileText, 
  MessageSquare, 
  Target,
  Calendar,
  Pause,
  Play,
  ExternalLink,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import ClientTasks from '../pages/client/Tasks';

export function ProgramTimelineView({ 
  clientProgram, 
  progress, 
  onMarkComplete, 
  onPauseResume,
  onViewProgram,
  onRestart
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completingElementId, setCompletingElementId] = useState(null);
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

  const getElementIcon = (type) => {
    switch (type) {
      case 'content': return <FileText className="h-4 w-4" />;
      case 'task': return <Target className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'checkin': return <Circle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };
  
  const isElementCompleted = (elementId) => {
    const completedElements = progress?.completedElementsArray;
    console.log("completedElements", completedElements)
    return Array.isArray(completedElements) && completedElements.includes(elementId);
  };

  const isElementCurrent = (element) => {
    // Calculate scheduled day from week and day
    const scheduledDay = (element.week - 1) * 7 + element.day;
    console.log('Element:', element);
    console.log('Element week:', element.week, 'Element day:', element.day);
    console.log('Scheduled day calculation:', scheduledDay);
    console.log('Current day:', progress?.currentDay);
    console.log('Is current?', scheduledDay <= progress?.currentDay);
    return scheduledDay <= progress?.currentDay;
  };

  const getElementStatus = (element) => {
    if (isElementCompleted(element?.id)) return 'completed';
    console.log("element", element)
    if (isElementCurrent(element)) return 'current';
    return 'upcoming';
  };

  const handleMarkComplete = async (elementId) => {
    setCompletingElementId(elementId);
    try {
      await onMarkComplete(elementId);
    } finally {
      setCompletingElementId(null);
    }
  };

  const groupedElements = clientProgram?.elements.reduce((acc, element) => {
    const week = element.week;
    if (!acc[week]) acc[week] = [];
    acc[week].push(element);
    return acc;
  }, {});
  const currentWeek = Math.ceil(progress?.currentDay / 7);
  return (
    <Card className={`border-l-4 border-l-primary ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
      <CardContent className={isMobile ? 'p-2' : 'p-4'}>
        {/* Program Header */}
        <div className={`flex items-start justify-between ${isMobile ? 'mb-2' : 'mb-4'}`}>
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 ${isMobile ? 'mb-1 flex-wrap' : 'mb-2'}`}>
              <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-lg'} break-words`}>{clientProgram?.name}</h3>
              <Badge variant={clientProgram?.status === 'active' ? 'default' : 'secondary'} className={isMobile ? 'text-[10px] px-1.5 py-0.5' : ''}>
                {clientProgram?.status}
              </Badge>
            </div>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'mb-2' : 'mb-3'} break-words`}>{clientProgram?.description}</p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-4'} ${isMobile ? 'mb-2' : 'mb-4'}`}>
          <div className={`text-center ${isMobile ? 'p-1.5' : 'p-3'} rounded-lg ${progress?.completionRate >= 100 ? 'bg-green-100' : 'bg-muted/50'}`}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold ${progress?.completionRate >= 100 ? 'text-green-600' : 'text-primary'}`}>
              {Math.round(progress?.completionRate)}%
            </div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} ${progress?.completionRate >= 100 ? 'text-green-600' : 'text-muted-foreground'} break-words`}>
              {progress?.completionRate >= 100 ? '🎉 Complete!' : 'Complete'}
            </div>
          </div>
          <div className={`text-center ${isMobile ? 'p-1.5' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold break-words`}>{currentWeek}</div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>of {clientProgram?.duration} weeks</div>
          </div>
          <div className={`text-center ${isMobile ? 'p-1.5' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold break-words`}>{Array.isArray(progress?.completedElementsArray) ? progress.completedElementsArray.length : 0}</div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>of {progress?.totalElements} tasks</div>
          </div>
          <div className={`text-center ${isMobile ? 'p-1.5' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold break-words`}>{progress?.currentDay}</div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>current day</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`${isMobile ? 'space-y-1' : 'space-y-2'} ${isMobile ? 'mb-2' : 'mb-4'}`}>
          <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <span className="break-words">Overall Progress</span>
            <span className="break-words">{Math.round(progress?.completionRate)}%</span>
          </div>
          <Progress value={progress?.completionRate} className={isMobile ? 'h-2' : 'h-3'} />
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2'} ${isMobile ? 'mb-2' : 'mb-4'}`}>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={async () => {
              setIsLoading(true);
              try {
                await onPauseResume();
                toast.success(
                  clientProgram?.status === 'active' ? 'Program Paused' : 'Program Resumed',
                  {
                    description: `${clientProgram?.name} has been ${clientProgram?.status === 'active' ? 'paused' : 'resumed'} successfully.`,
                  }
                );
              } catch (error) {
                toast.error('Error', {
                  description: 'Failed to update program status. Please try again.',
                });
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className={`flex items-center gap-1 ${isMobile ? 'text-xs h-7 px-2' : ''}`}
          >
            {clientProgram?.status === 'active' ? <Pause className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} /> : <Play className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
            <span className="break-words">{isLoading ? 'Updating...' : clientProgram?.status === 'active' ? 'Pause' : 'Resume'}</span>
          </Button>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 ${isMobile ? 'text-xs h-7 px-2' : ''}`}
          >
            {isExpanded ? <ChevronDown className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} /> : <ChevronRight className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />}
            <span className="break-words">{isExpanded ? 'Hide' : 'Show'} Timeline</span>
          </Button>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={onViewProgram}
            className={`flex items-center gap-1 ${isMobile ? 'text-xs h-7 px-2' : ''}`}
          >
            <ExternalLink className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            <span className="break-words">View Program Details</span>
          </Button>
          {clientProgram?.status === 'completed' && onRestart && (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "sm"}
              onClick={async () => {
                setIsLoading(true);
                try {
                  await onRestart();
                  toast.success('Program Restarted', {
                    description: `${clientProgram?.name} has been restarted and is ready to begin again.`,
                  });
                } catch (error) {
                  toast.error('Error', {
                    description: 'Failed to restart program. Please try again.',
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className={`flex items-center gap-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 ${isMobile ? 'text-xs h-7 px-2' : ''}`}
            >
              <RotateCcw className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              <span className="break-words">{isLoading ? 'Restarting...' : 'Restart Program'}</span>
            </Button>
          )}
        </div>

        {/* Expandable Timeline */}
        {isExpanded && (
          <div className={`border-t ${isMobile ? 'pt-2 space-y-2' : 'pt-4 space-y-4'}`}>
            {Object.entries(groupedElements)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([week, elements]) => (
                <div key={week} className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                  <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    <Badge variant={parseInt(week) === currentWeek ? 'default' : 'outline'} className={isMobile ? 'text-[10px] px-1.5 py-0.5' : ''}>
                      Week {week}
                    </Badge>
                    {parseInt(week) === currentWeek && (
                      <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'}>Current</Badge>
                    )}
                  </div>
                  
                  <div className={`${isMobile ? 'space-y-1.5 pl-2' : 'space-y-2 pl-4'} border-l-2 border-muted`}>
                    {elements
                      .sort((a, b) => a?.scheduledDay - b?.scheduledDay)
                      .map((element) => {
                        const status = getElementStatus(element);
                        const isCompleted = isElementCompleted(element.id);
                        return (
                          <div 
                            key={element?.id}
                            className={`flex items-center ${isMobile ? 'gap-1.5 p-1.5' : 'gap-3 p-3'} rounded-lg border transition-colors ${
                              status === 'completed' ? 'bg-green-50 border-green-200' :
                              status === 'current' ? 'bg-blue-50 border-blue-200' :
                              'bg-muted/30 border-muted'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle className={`${isMobile ? 'h-3 w-3' : 'h-5 w-5'} text-green-600`} />
                              ) : (
                                <div className={`${isMobile ? 'p-0.5' : 'p-1'} rounded-full ${
                                  status === 'current' ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {getElementIcon(element?.type)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className={`flex items-center gap-2 ${isMobile ? 'mb-0.5 flex-wrap' : 'mb-1'}`}>
                                <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} truncate break-words`}>{element?.title}</h4>
                                <Badge variant="outline" className={isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}>
                                  Day {(element?.week - 1) * 7 + element?.day}
                                </Badge>
                                {element?.scheduledTime && (
                                  <div className={`flex items-center gap-1 ${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                                    <Clock className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                                    {element?.scheduledTime}
                                  </div>
                                )}
                              </div>
                              {element?.description && (
                                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground line-clamp-2 break-words`}>
                                  {element?.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex-shrink-0">
                              {(() => {
                                console.log('Button rendering for element:', element?.id);
                                console.log('isCompleted:', isCompleted);
                                console.log('status:', status);
                                console.log('Should show button?', !isCompleted && status === 'current');
                                return !isCompleted && status === 'current' && (
                                  <Button
                                    variant="outline"
                                    size={isMobile ? "sm" : "sm"}
                                    onClick={() => handleMarkComplete(element?.id)}
                                    disabled={completingElementId === element?.id}
                                    className={isMobile ? 'text-[10px] h-6 px-1.5' : 'text-xs'}
                                  >
                                    {completingElementId === element?.id ? (
                                      <>
                                        <Loader2 className={`${isMobile ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'} animate-spin`} />
                                        <span className="break-words">Completing...</span>
                                      </>
                                    ) : (
                                      <span className="break-words">Mark Complete</span>
                                    )}
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Program Start Date */}
        <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'pt-2' : 'pt-3'} border-t`}>
          <Calendar className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
          <span className="break-words">Started: {new Date(clientProgram?.startDate)?.toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}