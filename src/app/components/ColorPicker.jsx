"use client";

import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Palette } from 'lucide-react';

const colorPresets = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Emerald', value: '#059669' }
];

export function ColorPicker({ value, onChange }) {
  const handleColorSelect = (color) => {
    onChange(color);
  };

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="w-4 h-4 rounded-full mr-2 border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm">
            {colorPresets.find(c => c.value === value)?.name || 'Custom'}
          </span>
          <Palette className="h-4 w-4 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64" 
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
            <h4 className="text-sm font-medium mb-2">Preset Colors</h4>
            <div className="grid grid-cols-6 gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.value);
                  }}
                  className="w-8 h-8 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Custom Color</h4>
            <input
              type="color"
              value={value}
              onChange={(e) => {
                e.stopPropagation();
                handleColorSelect(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

