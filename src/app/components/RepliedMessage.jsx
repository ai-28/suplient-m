"use client"
import React from 'react';
import { Button } from '@/app/components/ui/button';
import { File, Mic } from 'lucide-react';

export const RepliedMessage = ({
  repliedMessage,
  onScrollToMessage,
  className = ""
}) => {
  const handleClick = () => {
    if (onScrollToMessage) {
      onScrollToMessage(repliedMessage.id);
    }
  };

  const getReplyContent = () => {
    switch (repliedMessage.type) {
      case 'voice':
        return (
          <div className="flex items-center gap-2">
            <Mic className="h-3 w-3" />
            <span className="text-xs">Voice message</span>
          </div>
        );
      case 'file':
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <File className="h-3 w-3" />
            <span className="text-xs">{repliedMessage.fileName || 'File'}</span>
          </div>
        );
      case 'image':
        return <span className="text-xs">📷 Image</span>;
      default:
        return (
          <p className="text-xs line-clamp-2">{repliedMessage.content}</p>
        );
    }
  };

  return (
    <Button
      variant="ghost"
      className={`w-full p-2 h-auto justify-start bg-muted/50 border-l-2 border-primary/60 rounded-none rounded-t-md mb-1 hover:bg-muted ${className}`}
      onClick={handleClick}
    >
      <div className="text-left min-w-0 flex-1">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs font-medium text-primary">
            {repliedMessage.senderName}
          </span>
        </div>
        <div className="text-muted-foreground">
          {getReplyContent()}
        </div>
      </div>
    </Button>
  );
};