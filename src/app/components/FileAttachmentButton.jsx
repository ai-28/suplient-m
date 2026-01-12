"use client"

import React, { useRef, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Paperclip, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const FileAttachmentButton = ({
  onFileSelect,
  className = "",
  acceptedTypes = "image/*,application/pdf,.doc,.docx,.txt",
  maxSize = 10,
  iconType = 'clip'
}) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size validation
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    // File type validation
    const allowedTypes = acceptedTypes.split(',').map(type => type.trim());
    const isValidType = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type || file.name.toLowerCase().endsWith(type);
    });

    if (!isValidType) {
      toast.error('File type not supported');
      return;
    }

    onFileSelect(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={`h-9 w-9 p-0 hover:bg-accent ${className}`}
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        {iconType === 'plus' ? (
          <Plus className="h-5 w-5" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
};