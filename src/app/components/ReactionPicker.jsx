"use client"

import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { EmojiPickerComponent } from './EmojiPicker';



const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ReactionPicker = ({
  onReactionSelect,
  className = "",
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickReaction = (emoji) => {
    onReactionSelect(emoji);
    setIsOpen(false);
  };

  const handleEmojiSelect = (emoji) => {
    onReactionSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 hover:bg-accent ${className}`}
          >
            😊
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        side="top"
        align="center"
      >
        <div className="space-y-2">
          {/* Quick reactions */}
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={() => handleQuickReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
          
          {/* More emojis button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full text-xs">
                More emojis
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0 shadow-lg" side="top">
              <EmojiPickerComponent onEmojiClick={handleEmojiSelect} />
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
};