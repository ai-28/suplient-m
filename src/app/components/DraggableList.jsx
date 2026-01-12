"use client";

import { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function DraggableList({ items, onReorder, renderItem, className = "" }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, removed);

    // Update order values
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    onReorder(reorderedItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const reorderedItems = newItems.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    onReorder(reorderedItems);
  };

  const handleMoveDown = (index) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const reorderedItems = newItems.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    onReorder(reorderedItems);
  };

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={() => {
            setDraggedIndex(null);
            setDragOverIndex(null);
          }}
          className={`
            relative transition-all duration-200
            ${draggedIndex === index ? 'opacity-50' : ''}
            ${dragOverIndex === index ? 'border-primary border-2' : ''}
          `}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 cursor-move"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveUp(index);
                }}
                disabled={index === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 cursor-move"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveDown(index);
                }}
                disabled={index === items.length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            {renderItem(item, index)}
          </div>
        </div>
      ))}
    </div>
  );
}

