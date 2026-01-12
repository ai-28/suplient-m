"use client"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddMemberToGroupDialog({
  open,
  onOpenChange,
  groupName,
  onAddMember,
  groupId, // Add groupId prop to exclude existing members
  }) {
  const [selectedClient, setSelectedClient] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [addMethod, setAddMethod] = useState("existing");
  const [isLoading, setIsLoading] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Fetch available clients when dialog opens
  useEffect(() => {
    const fetchAvailableClients = async () => {
      if (!open) return;
      
      setClientsLoading(true);
      try {
        const url = groupId ? `/api/clients/available?groupId=${groupId}` : '/api/clients/available';
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch available clients');
        }
        
        const data = await response.json();
        setAvailableClients(data.clients || []);
      } catch (error) {
        console.error('Error fetching available clients:', error);
        toast.error('Failed to load available clients');
        setAvailableClients([]);
      } finally {
        setClientsLoading(false);
      }
    };

    fetchAvailableClients();
  }, [open, groupId]);

  const handleAddExistingClient = async () => {
    if (!selectedClient) {
      toast.error("Please select a client to add");
      return;
    } 

    setIsLoading(true);
    try {
      const client = availableClients.find(c => c.id.toString() === selectedClient);
      if (client) {
        // Call the API to add the client to the group
        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientIds: [client.id]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add client to group');
        }

        const result = await response.json();
        
        // Call the parent callback with the added client info
        onAddMember({
          id: client.id,
          name: client.name,
          email: client.email,
          type: "existing"
        });
        
        toast.success(`${client.name} has been added to ${groupName}`);
        onOpenChange(false);
        setSelectedClient("");
      }
    } catch (error) {
      console.error('Error adding client to group:', error);
      toast.error(error.message || "Failed to add member to group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      onAddMember({
        name: inviteEmail.split('@')[0], // Use email prefix as temporary name
        email: inviteEmail,
        type: "invite"
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      onOpenChange(false);
      setInviteEmail("");
    } catch (error) {
      toast.error("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedClient("");
    setInviteEmail("");
    setAddMethod("existing");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member to {groupName}
          </DialogTitle>
          <DialogDescription>
            Add an existing client or invite a new member to join this group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Method Selection */}
          <div className="flex gap-2">
            <Button
              variant={addMethod === "existing" ? "default" : "outline"}
              onClick={() => setAddMethod("existing")}
              className="flex-1"
              size="sm"
            >
              Add Existing Client
            </Button>
            <Button
              variant={addMethod === "invite" ? "default" : "outline"}
              onClick={() => setAddMethod("invite")}
              className="flex-1"
              size="sm"
            >
              Send Invitation
            </Button>
          </div>

          {addMethod === "existing" ? (
            <div className="space-y-3">
              <Label htmlFor="client-select">Select Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Choose a client to add"} />
                </SelectTrigger>
                <SelectContent>
                  {clientsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading clients...</span>
                    </div>
                  ) : availableClients.length === 0 ? (
                    <div className="flex items-center justify-center p-4">
                      <span className="text-sm text-muted-foreground">No available clients</span>
                    </div>
                  ) : (
                    availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-sm text-muted-foreground">{client.email}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddExistingClient} 
                disabled={!selectedClient || isLoading || clientsLoading}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isLoading ? "Adding..." : "Add to Group"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="client@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendInvite()}
              />
              <Button 
                onClick={handleSendInvite} 
                disabled={!inviteEmail.trim() || isLoading}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}