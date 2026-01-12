"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MembershipRequestDialog({ 
  open, 
  onOpenChange, 
  group, 
  clientId, 
  clientName, 
  clientEmail 
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!group) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/groups/${group.id}/membership-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim() || undefined
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Request sent successfully!', {
          description: 'The group coach will be notified and review your request.'
        });
        setMessage("");
        onOpenChange(false);
      } else {
        throw new Error(data.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending membership request:', error);
      toast.error('Failed to send request', {
        description: error.message || 'Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request to Join "{group.name}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">Group Details:</h4>
            <p className="text-sm text-muted-foreground">{group.description}</p>
            <p className="text-sm text-muted-foreground">
              Focus Area: {group.focusArea || 'General'} | Members: {group.members}/{group.maxMembers || '∞'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Why would you like to join this group? (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share why this group interests you or how you think it might help..."
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Your request will be sent to the group coach for approval. You'll be notified once they review your request.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}