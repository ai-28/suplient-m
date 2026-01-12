"use client";

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Input } from '@/app/components/ui/input';
import { Smile } from 'lucide-react';

const commonIcons = [
  '🎯', '🌙', '🥗', '🏃‍♂️', '📚', '❤️', '💪', '🧘', '🎨', '🎵',
  '📱', '⏰', '☁️', '🔥', '⭐', '🌟', '💡', '🌈', '🌱', '🌊',
  '🏆', '🎪', '🎭', '🎬', '🎮', '📖', '✍️', '🎤', '🎸', '🎹',
  '🏋️', '🚴', '🏊', '🧗', '🏄', '⛷️', '🎿', '🏀', '⚽', '🎾',
  '🍎', '🥑', '🥦', '🍊', '🍓', '🍇', '🥝', '🍌', '🥥', '🍉',
  '☕', '🍵', '🥤', '🍼', '🍺', '🍷', '🥂', '🍾', '🧃', '🧉'
];

export function IconPicker({ value, onChange, placeholder = "🎯" }) {
  const [open, setOpen] = useState(false);
  const [customIcon, setCustomIcon] = useState('');

  const handleIconSelect = (icon) => {
    onChange(icon);
    setOpen(false);
  };

  const handleCustomIcon = () => {
    if (customIcon.trim()) {
      onChange(customIcon.trim());
      setCustomIcon('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xl mr-2">{value || placeholder}</span>
          <Smile className="h-4 w-4 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80" 
        align="start"
        onInteractOutside={(e) => {
          // Prevent closing when clicking inside dialog
          const target = e.target;
          if (target && target.closest && target.closest('[role="dialog"]')) {
            e.preventDefault();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <h4 className="text-sm font-medium mb-2">Common Icons</h4>
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
              {commonIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIconSelect(icon);
                  }}
                  className="text-2xl hover:bg-muted rounded p-2 transition-colors flex items-center justify-center aspect-square"
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Custom Icon</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter emoji"
                value={customIcon}
                onChange={(e) => {
                  e.stopPropagation();
                  setCustomIcon(e.target.value);
                }}
                maxLength={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCustomIcon();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCustomIcon();
                }}
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

