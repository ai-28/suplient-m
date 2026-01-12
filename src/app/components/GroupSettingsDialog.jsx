"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { MembershipRequestsPanel } from "@/app/components/MembershipRequestsPanel";
import { 
  Users2, 
  Save, 
  Trash2, 
  UserMinus,
  Calendar,
  Settings,
  UserPlus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export function GroupSettingsDialog({ open, onOpenChange, group }) {
  const [groupName, setGroupName] = useState(group?.name || "");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("12");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Initialize form fields when group data is available
  useEffect(() => {
    if (group && open) {
      setGroupName(group.name || "");
      setDescription(group.description || "");
      setCapacity(group.capacity?.toString() || "12");
    }
  }, [group, open]);

  // Fetch group members when dialog opens
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!open || !group?.id) return;
      
      setMembersLoading(true);
      try {
        const response = await fetch(`/api/groups/${group.id}/members`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch group members');
        }
        
        const data = await response.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Error fetching group members:', error);
        toast.error('Failed to load group members');
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchGroupMembers();
  }, [open, group?.id]);

  const handleSave = async () => {
    try {
      // Prepare the update data
      const updateData = {
        name: groupName,
        description: description,
        capacity: parseInt(capacity)
      };

      // Call the API to update the group
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update group');
      }

      const result = await response.json();
      
      // Show success message
      toast.success(`${groupName} has been successfully updated.`);
      
      // Close the dialog
      onOpenChange(false);
      
      // Optionally refresh the page or trigger a callback to update the parent component
      window.location.reload(); // Simple refresh for now
      
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error.message || 'Failed to update group settings');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    try {
      // Call the API to remove the member from the group
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientIds: [memberId]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member from group');
      }

      const result = await response.json();
      
      // Update local state to reflect the removal
      setMembers(members.filter(member => member.id !== memberId));
      toast.success(`${memberName} has been removed from the group.`);
    } catch (error) {
      console.error('Error removing member from group:', error);
      toast.error(error.message || "Failed to remove member from group");
    }
  };

  const handleAddMember = () => {
    if (!newMemberEmail.trim() || !group) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    // Use the membership request system for coach invitations
    inviteClient(
      group.id,
      `client_${Date.now()}`, // Generate a client ID
      newMemberEmail.split('@')[0], // Use email prefix as name
      newMemberEmail
    );
    
    const newMember = {
      id: Math.max(...members.map(m => m.id)) + 1,
      name: newMemberEmail,
      initial: newMemberEmail.charAt(0).toUpperCase(),
      status: "active", // Coach invitations are immediately active
      joinDate: new Date().toISOString().split('T')[0]
    };
    
    setMembers([...members, newMember]);
    setNewMemberEmail("");
    setShowAddMember(false);
  };

  const handleDeleteGroup = () => {
    toast({
      title: "Group Deleted",
      description: `${group?.name} has been permanently deleted.`,
      variant: "destructive",
    });
    onOpenChange(false);
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-full mx-2' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className={isMobile ? 'space-y-2' : 'space-y-3'}>
          <DialogTitle className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold text-foreground flex items-center gap-3 break-words`}>
            <div className={`bg-gradient-primary rounded-lg ${isMobile ? 'p-1' : 'p-2'}`}>
              <Settings className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
            </div>
            <span className="break-words min-w-0 flex-1">Group Settings - {group.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className={isMobile ? 'py-2' : 'py-6'}>
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 gap-1 h-auto p-1' : 'grid-cols-3'}`}>
            <TabsTrigger value="settings" className={isMobile ? 'text-xs px-1 py-1.5' : ''}>Settings</TabsTrigger>
            <TabsTrigger value="members" className={isMobile ? 'text-xs px-1 py-1.5' : ''}>Members</TabsTrigger>
            <TabsTrigger value="requests" className={isMobile ? 'text-xs px-1 py-1.5' : ''}>Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className={isMobile ? 'mt-2' : 'mt-6'}>
            <div className={`grid grid-cols-1 ${isMobile ? '' : 'lg:grid-cols-2'} ${isMobile ? 'gap-3' : 'gap-8'}`}>
          {/* Left Column - Basic Settings */}
          <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
                <Users2 className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
                Basic Information
              </h3>
              
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                <div>
                  <Label htmlFor="groupName" className={isMobile ? 'text-xs' : ''}>Group Name</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className={`mt-1 ${isMobile ? 'text-xs h-8' : ''}`}
                  />
                </div>

                <div>
                  <Label htmlFor="description" className={isMobile ? 'text-xs' : ''}>Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the group's purpose and goals..."
                    className={`mt-1 ${isMobile ? 'min-h-[60px] text-xs' : 'min-h-[100px]'}`}
                  />
                </div>


                <div>
                  <Label htmlFor="capacity" className={isMobile ? 'text-xs' : ''}>Maximum Capacity</Label>
                  <Select value={capacity} onValueChange={setCapacity}>
                    <SelectTrigger className={isMobile ? 'mt-1 text-xs h-8' : 'mt-1'}>
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 members</SelectItem>
                      <SelectItem value="8">8 members</SelectItem>
                      <SelectItem value="10">10 members</SelectItem>
                      <SelectItem value="12">12 members</SelectItem>
                      <SelectItem value="15">15 members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Session Schedule */}
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
                <Calendar className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
                Next Session
              </h3>
              
              <div className={`bg-muted rounded-lg ${isMobile ? 'p-2' : 'p-4'}`}>
                <div className={`flex items-center ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
                  <div className={isMobile ? 'w-full' : ''}>
                    <p className={`${isMobile ? 'text-xs' : ''} font-medium text-foreground break-words`}>Scheduled for</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>{group.nextSession}</p>
                  </div>
                  <Badge variant="secondary" className={isMobile ? 'text-xs w-full justify-center' : ''}>Confirmed</Badge>
                </div>
              </div>
              </div>
            </div>

            {/* Right Column - Session Schedule */}
            {!isMobile && (
            <div className="space-y-6">
              {/* Session Schedule */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Next Session
                </h3>
                
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Scheduled for</p>
                      <p className="text-sm text-muted-foreground">{group.nextSession}</p>
                    </div>
                    <Badge variant="secondary">Confirmed</Badge>
                  </div>
                </div>
              </div>
            </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="members" className={isMobile ? 'mt-2' : 'mt-6'}>
            <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
                  <Users2 className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
                  Members ({membersLoading ? "..." : members.length})
                </h3>

                <div className={`space-y-3 ${isMobile ? 'max-h-[300px]' : 'max-h-[400px]'} overflow-y-auto`}>
                  {membersLoading ? (
                    <div className={`flex items-center justify-center ${isMobile ? 'p-4' : 'p-8'}`}>
                      <Loader2 className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
                      <span className={`${isMobile ? 'text-xs ml-1' : 'text-sm ml-2'} text-muted-foreground`}>Loading members...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className={`flex items-center justify-center ${isMobile ? 'p-4' : 'p-8'}`}>
                      <div className="text-center">
                        <Users2 className={isMobile ? 'h-8 w-8' : 'h-12 w-12'} />
                        <p className={`${isMobile ? 'text-xs' : ''} text-muted-foreground font-medium break-words`}>No members yet</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mt-1 break-words`}>Add members to get started</p>
                      </div>
                    </div>
                  ) : (
                    members.map((member) => (
                    <div key={member.id} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} ${isMobile ? 'p-2' : 'p-3'} bg-card border border-border rounded-lg gap-2`}>
                      <div className={`flex items-center ${isMobile ? 'w-full' : 'gap-3'} min-w-0`}>
                        <Avatar className={isMobile ? 'h-8 w-8' : 'h-10 w-10'}>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {member.initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={`${isMobile ? 'text-xs' : ''} font-medium text-foreground break-words`}>{member.name}</p>
                          <p className={`${isMobile ? 'text-[10px]' : 'text-sm'} text-muted-foreground break-words`}>
                            Joined {new Date(member.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                        <Badge variant={member.status === "active" ? "success" : member.status === "pending" ? "warning" : "secondary"} className={isMobile ? 'text-xs' : ''}>
                          {member.status}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size={isMobile ? "sm" : "sm"}
                              variant="ghost"
                              className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${isMobile ? 'h-7 w-7 p-0' : ''}`}
                            >
                              <UserMinus className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className={isMobile ? 'mx-2 max-w-[calc(100vw-1rem)]' : ''}>
                            <AlertDialogHeader>
                              <AlertDialogTitle className={isMobile ? 'text-sm' : ''}>Remove Member</AlertDialogTitle>
                              <AlertDialogDescription className={isMobile ? 'text-xs' : ''}>
                                Are you sure you want to remove {member.name} from this group? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                              <AlertDialogCancel className={isMobile ? 'w-full text-xs' : ''}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${isMobile ? 'w-full text-xs' : ''}`}
                              >
                                Remove Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    ))
                  )}
                </div>

                {/* Add Member Form */}
                {showAddMember ? (
                  <div className={`space-y-3 ${isMobile ? 'p-2 space-y-2' : 'p-4'} bg-muted rounded-lg`}>
                    <Label htmlFor="newMemberEmail" className={isMobile ? 'text-xs' : ''}>Member Email</Label>
                    <Input
                      id="newMemberEmail"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Enter member email address"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                      className={isMobile ? 'text-xs h-8' : ''}
                    />
                    <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                      <Button size={isMobile ? "sm" : "sm"} onClick={handleAddMember} className={`${isMobile ? 'w-full text-xs h-8' : 'flex-1'}`}>
                        <UserPlus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                        Send Invitation
                      </Button>
                      <Button size={isMobile ? "sm" : "sm"} variant="outline" onClick={() => {
                        setShowAddMember(false);
                        setNewMemberEmail("");
                      }} className={isMobile ? 'w-full text-xs h-8' : ''}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
                    onClick={() => setShowAddMember(true)}
                    size={isMobile ? "sm" : "default"}
                  >
                    <UserPlus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    Invite New Member
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className={isMobile ? 'mt-2' : 'mt-6'}>
            <MembershipRequestsPanel groupId={group?.id} />
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between'} ${isMobile ? 'pt-3' : 'pt-6'} border-t border-border`}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className={`flex items-center gap-2 ${isMobile ? 'w-full text-xs h-8' : ''}`}
                size={isMobile ? "sm" : "default"}
              >
                <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                Delete Group
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={isMobile ? 'mx-2 max-w-[calc(100vw-1rem)]' : ''}>
              <AlertDialogHeader>
                <AlertDialogTitle className={isMobile ? 'text-sm' : ''}>Delete Group</AlertDialogTitle>
                <AlertDialogDescription className={isMobile ? 'text-xs break-words' : ''}>
                  Are you sure you want to delete "{group.name}"? This action cannot be undone. All group data, members, and sessions will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                <AlertDialogCancel className={isMobile ? 'w-full text-xs' : ''}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteGroup}
                  className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${isMobile ? 'w-full text-xs' : ''}`}
                >
                  Delete Group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className={`flex ${isMobile ? 'flex-col gap-2 w-full' : 'gap-3'}`}>
            <Button variant="outline" onClick={() => onOpenChange(false)} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
              Cancel
            </Button>
            <Button onClick={handleSave} className={`bg-gradient-primary text-black hover:text-white ${isMobile ? 'w-full text-xs h-8' : ''}`} size={isMobile ? "sm" : "default"}>
              <Save className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}