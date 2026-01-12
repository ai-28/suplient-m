"use client"

import React from 'react';
import { MessageWithLinks } from '@/app/components/MessageWithLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

/**
 * Preview component that shows how the program message will appear to clients
 * Matches the exact styling of the chat interface
 */
export function ProgramMessagePreview({ elements, programDay, onClose, isMobile = false }) {
  // Safety check
  if (!programDay) {
    return null;
  }

  if (!elements || elements.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>
              Day {programDay} Preview
            </CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            No elements scheduled for this day
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format message using the same logic as delivery service
  const formatMessage = () => {
    const parts = [];

    // Add day header
    parts.push(`📅 **Day ${programDay} of Your Program**\n`);

    // Message elements
    const messages = elements.filter(e => e.type === 'message');
    messages.forEach(msg => {
      let elementData = msg.elementData || msg.data || {};
      
      // Parse if string
      if (typeof elementData === 'string') {
        try {
          elementData = JSON.parse(elementData);
        } catch (e) {
          elementData = {};
        }
      }
      
      const content = elementData?.message || msg.title;
      if (content) {
        parts.push(content);
      }
    });

    // Task elements
    const tasks = elements.filter(e => e.type === 'task');
    if (tasks.length > 0) {
      parts.push('\n📋 **Your Tasks for Today:**\n');
      tasks.forEach(task => {
        let elementData = task.elementData || task.data || {};
        
        // Parse if string
        if (typeof elementData === 'string') {
          try {
            elementData = JSON.parse(elementData);
          } catch (e) {
            elementData = {};
          }
        }
        
        parts.push(`• **${task.title}**`);
        if (elementData?.description) {
          parts.push(`  ${elementData.description}`);
        }
      });
    }

    // File/Resource elements
    const files = elements.filter(e => e.type === 'content' || e.type === 'file');
    if (files.length > 0) {
      files.forEach(file => {
        let elementData = file.elementData || file.data || {};
        
        // Parse if string
        if (typeof elementData === 'string') {
          try {
            elementData = JSON.parse(elementData);
          } catch (e) {
            elementData = {};
          }
        }
        
        // Use elementData.title if available (new schema), fallback to file.title
        const fileTitle = elementData?.title || file.title;
        
        if (elementData?.url || elementData?.fileUrl) {
          const url = elementData.url || elementData.fileUrl;
          parts.push(`\n📄 You can find the detailed guide [${fileTitle}](${url}) in your Library.`);
        } else {
          parts.push(`\n📄 **${fileTitle}**`);
        }
      });
    }

    return parts.join('\n');
  };

  const messageContent = formatMessage();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>
              Day {programDay} Preview
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              How this will appear to your client
            </p>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {/* Chat-like preview container */}
        <div className="space-y-4">
          {/* Simulated chat interface */}
          <div className="flex justify-end">
            <div className="max-w-[90%]">
              {/* Message bubble - matches chat interface styling for received messages */}
              <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  <MessageWithLinks messageText={messageContent} />
                </p>
              </div>
              {/* Timestamp */}
              <span className="text-xs text-muted-foreground mt-1 block">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

