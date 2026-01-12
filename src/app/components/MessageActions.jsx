import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Reply, Smile, Edit2, Trash2 } from 'lucide-react';
import { ReactionPicker } from './ReactionPicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';

export const MessageActions = ({
  message,
  onReply,
  onReaction,
  onEdit,
  onDelete,
  currentUserId,
  className = ""
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  const isOwnMessage = message.senderId === currentUserId;
  const isDeleted = message.isDeleted;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
      setShowDeleteDialog(false);
    }
  };

  // Don't show edit/delete for deleted messages
  if (isDeleted) {
    return null;
  }

  if (isEditing) {
    return (
      <div className={`flex gap-2 items-center ${className}`}>
        <Input
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            }
            if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
          className="flex-1"
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveEdit}
          disabled={!editContent.trim()}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancelEdit}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${className}`}>
        {isOwnMessage && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent"
            onClick={handleEdit}
            title="Edit message"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
        
        {isOwnMessage && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            title="Delete message"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        {onReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent"
            onClick={() => onReply(message)}
            title="Reply"
          >
            <Reply className="h-3 w-3" />
          </Button>
        )}
        
        {onReaction && (
          <ReactionPicker onReactionSelect={onReaction}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent"
              title="Add reaction"
            >
              <Smile className="h-3 w-3" />
            </Button>
          </ReactionPicker>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This will permanently remove it for both you and the recipient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};