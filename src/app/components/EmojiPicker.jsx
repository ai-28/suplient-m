"use client"

import React from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useTheme } from 'next-themes';

export const EmojiPickerComponent = ({
  onEmojiClick,
  className = ""
}) => {
  const { theme } = useTheme();

  const handleEmojiClick = (emojiData) => {
    onEmojiClick(emojiData.emoji);
  };

  return (
    <div className={className}>
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        height={400}
        width={350}
        previewConfig={{
          showPreview: false
        }}
        searchPlaceholder="Search emojis..."
      />
    </div>
  );
};