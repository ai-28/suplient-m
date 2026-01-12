"use client"
import React from 'react';
import { Button } from '@/app/components/ui/button';
import { X, Reply, File, Mic } from 'lucide-react';

export const ReplyPreview = ({
  replyToMessage,
  onCancel,
  className = ""
}) => {
  const getPreviewContent = () => {
    switch (replyToMessage.type) {
      case 'voice':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mic className="h-4 w-4" />
            <span>Voice message</span>
          </div>
        );
      case 'file':
      case 'document':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <File className="h-4 w-4" />
            <span>{replyToMessage.fileName || 'File'}</span>
          </div>
        );
      case 'image':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>📷 Image</span>
          </div>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {replyToMessage.content}
          </p>
        );
    }
  };

  return (
    <div className={`bg-muted/50 border-l-4 border-primary p-3 rounded-t-md ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Reply className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Replying to {replyToMessage.senderName}
            </span>
          </div>
          {getPreviewContent()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};