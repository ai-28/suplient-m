"use client"

import React, { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Smile } from 'lucide-react';
import { EmojiPickerComponent } from './EmojiPicker';


export const EmojiButton = ({
  onEmojiSelect,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`h-9 w-9 p-0 hover:bg-accent ${className}`}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-0 shadow-lg" 
        side="top"
        align="end"
      >
        <EmojiPickerComponent onEmojiClick={handleEmojiClick} />
      </PopoverContent>
    </Popover>
  );
};