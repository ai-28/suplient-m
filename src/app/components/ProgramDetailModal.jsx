"use client"
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { CheckCircle2, Clock, FileText, MessageCircle, ClipboardList, Calendar, Play, Pause, Eye, Download } from 'lucide-react';
import { useState } from 'react';
import { Program, ClientProgram, ProgramElement } from '@/app/types/program';
import { useFormatting } from '@/app/hooks/useFormatting';
import { MessageWithLinks } from '@/app/components/MessageWithLinks';

export function ProgramDetailModal({
  open,
  onOpenChange,
  program,
  clientProgram,
  completionRate,
  onMarkComplete,
  onPauseResume
}) {
  const { formatDate } = useFormatting();
  const [loadingResource, setLoadingResource] = useState(null);

  const handleViewContent = async (element) => {
    const libraryFileId = element.data?.libraryFileId;
    if (!libraryFileId) return;

    try {
      setLoadingResource(element.id);
      const response = await fetch(`/api/resources/${libraryFileId}/access?action=access`);
      if (!response.ok) throw new Error('Failed to access resource');
      
      const data = await response.json();
      window.open(data.resource.url, '_blank');
    } catch (error) {
      console.error('Error viewing resource:', error);
    } finally {
      setLoadingResource(null);
    }
  };

  const handleDownloadContent = async (element) => {
    const libraryFileId = element.data?.libraryFileId;
    if (!libraryFileId) return;

    try {
      setLoadingResource(element.id);
      const response = await fetch(`/api/resources/${libraryFileId}/access?action=download`);
      if (!response.ok) throw new Error('Failed to download resource');
      
      const data = await response.json();
      const link = document.createElement('a');
      link.href = data.downloadUrl || data.resource.url;
      link.download = data.fileName || element.data?.fileName || element.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading resource:', error);
    } finally {
      setLoadingResource(null);
    }
  };

  const getElementIcon = (type) => {
    switch (type) {
      case 'content': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'task': return <ClipboardList className="h-4 w-4 text-green-500" />;
      case 'message': return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'checkin': return <CheckCircle2 className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getElementTypeBadge = (type) => {
    const variants = {
      content: 'default',
      task: 'secondary',
      message: 'outline',
      checkin: 'destructive'
    };
    
    return (
      <Badge variant={variants[type] || 'default'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const isElementCompleted = (elementId) => {
    return clientProgram.progress.completedElements.includes(elementId);
  };

  const isElementCurrent = (elementId) => {
    return clientProgram.progress.nextScheduledElement === elementId;
  };

  const getElementDescription = (element) => {
    switch (element.type) {
      case 'content':
        const contentData = element.data;
        return `${contentData.fileName} - ${contentData.category}`;
      case 'task':
        const taskData = element.data;
        return taskData.description;
      case 'message':
        const messageData = element.data;
        return messageData.message || '';
      case 'checkin':
        const checkinData = element.data;
        return `${checkinData.questions.length} questions`;
      default:
        return element.description || '';
    }
  };

  // Group elements by week
  const groupedElements = program.elements.reduce((acc, element) => {
    const week = Math.ceil(element.scheduledDay / 7);
    if (!acc[week]) acc[week] = [];
    acc[week].push(element);
    return acc;
    }, {});

  const currentWeek = Math.ceil(clientProgram.progress.currentDay / 7);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {program.name}
            <Badge variant={clientProgram.status === 'active' ? 'default' : 'secondary'}>
              {clientProgram.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {program.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(completionRate)}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{currentWeek}/{program.duration}</div>
              <div className="text-sm text-muted-foreground">Current Week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{clientProgram.progress.currentDay}</div>
              <div className="text-sm text-muted-foreground">Days Active</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Program Timeline</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onPauseResume}
            disabled={clientProgram.status === 'completed'}
          >
            {clientProgram.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Program
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Program
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-6">
            {Object.entries(groupedElements).map(([week, elements]) => (
              <div key={week} className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                  <h4 className="font-medium text-sm">Week {week}</h4>
                  {parseInt(week) === currentWeek && (
                    <Badge variant="outline">Current Week</Badge>
                  )}
                </div>
                
                <div className="space-y-2 ml-4">
                  {elements.map((element) => {
                    const isCompleted = isElementCompleted(element.id);
                    const isCurrent = isElementCurrent(element.id);
                    
                    return (
                      <Card 
                        key={element.id} 
                        className={`transition-all ${
                          isCurrent ? 'ring-2 ring-primary' : ''
                        } ${isCompleted ? 'bg-muted/50' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex items-center gap-2 mt-1">
                                {getElementIcon(element.type)}
                                {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {element.title}
                                  </h5>
                                  {getElementTypeBadge(element.type)}
                                  {isCurrent && <Badge variant="outline">Next</Badge>}
                                </div>
                                
                                <p className="text-xs text-muted-foreground mb-2">
                                  Day {element.scheduledDay} • {element.scheduledTime}
                                </p>
                                
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {element.type === 'message' 
                                    ? <MessageWithLinks messageText={getElementDescription(element)} />
                                    : getElementDescription(element)
                                  }
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-3">
                              {element.type === 'content' && element.data?.libraryFileId && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewContent(element)}
                                    disabled={loadingResource === element.id}
                                    title="View document"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadContent(element)}
                                    disabled={loadingResource === element.id}
                                    title="Download document"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {!isCompleted && isCurrent && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onMarkComplete(element.id)}
                                >
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Started: {formatDate(clientProgram.startDate)}
          </div>
          <div className="text-sm text-muted-foreground">
            {clientProgram.progress.completedElements.length} of {program.elements.length} elements completed
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}