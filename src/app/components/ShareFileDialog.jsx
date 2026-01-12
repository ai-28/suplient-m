"use client"
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Share2, Search, Users, User, UserCheck, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";



export function ShareFileDialog({ file, files, onShare, children }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("individuals");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  
  // Real data states
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState(null);

  // Fetch clients and groups when dialog opens
  useEffect(() => {
    if (open) {
      fetchClients();
      fetchGroups();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      setError(null);
      const response = await fetch('/api/clients');
      const result = await response.json();
      
      if (result.status) {
        setClients(result.clients || []);
      } else {
        setError(result.message || 'Failed to fetch clients');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to fetch clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      setError(null);
      const response = await fetch('/api/groups');
      const result = await response.json();
      
      if (result.groups) {
        setGroups(result.groups || []);
      } else {
        setError(result.error || 'Failed to fetch groups');
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to fetch groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClientToggle = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleQuickSelect = (type) => {
    switch (type) {
      case "all-active":
        setSelectedClients(clients.filter(c => c.status === "Active").map(c => c.id));
        break;
      case "all-clients":
        setSelectedClients(clients.map(c => c.id));
        break;
      case "all-groups":
        setSelectedGroups(groups.map(g => g.id));
        break;
      case "clear":
        setSelectedClients([]);
        setSelectedGroups([]);
        break;
    }
  };

  const handleShare = async () => {
    if (selectedClients.length === 0 && selectedGroups.length === 0) {
      toast.error("Please select at least one client or group to share with.");
      return;
    }

    setSharing(true);
    
    try {
      const filesToShare = files || (file ? [file] : []);
      
      // Debug: Log the file data structure
      console.log('Files to share:', filesToShare);
      console.log('File structure:', filesToShare.map(f => ({ id: f.id, title: f.title, url: f.url })));
      
      // Share each file individually
      const sharePromises = filesToShare.map(async (fileItem) => {
        console.log('Sharing file item:', fileItem);
        
        // Handle nested data structure from various APIs
        let actualFileItem = fileItem;
        const nestedTypes = ['image', 'article', 'video', 'sound', 'template', 'program'];
        let foundNestedType = null;
        
        for (const type of nestedTypes) {
          if (fileItem[type] && fileItem[type].id) {
            foundNestedType = type;
            break;
          }
        }
        
        if (foundNestedType) {
          actualFileItem = {
            ...fileItem[foundNestedType],
            url: fileItem.url,
            filename: fileItem.filename
          };
          console.log(`Using nested ${foundNestedType} data:`, actualFileItem);
        }
        
        console.log('File item ID:', actualFileItem.id);
        
        // Check if file has required ID
        if (!actualFileItem.id) {
          console.error('File missing ID:', actualFileItem);
          throw new Error(`File "${actualFileItem.title || 'Unknown'}" is missing required ID field. Please refresh the page and try again.`);
        }
        
        const response = await fetch('/api/resources/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resourceId: actualFileItem.id,
            clientIds: selectedClients,
            groupIds: selectedGroups,
            message: shareMessage
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to share resource');
        }

        return response.json();
      });

      await Promise.all(sharePromises);
      
      const shareData = {
        files: filesToShare,
        clients: selectedClients,
        groups: selectedGroups,
        message: shareMessage,
        sharedAt: new Date().toISOString()
      };

      onShare?.(shareData);
      
      const totalRecipients = selectedClients.length + selectedGroups.reduce((sum, groupId) => {
        const group = groups.find(g => g.id === groupId);
        return sum + (group?.memberCount || 0);
      }, 0);

      const fileCount = filesToShare.length;
      const fileText = fileCount === 1 ? "file" : "files";
      
      toast.success(`${fileCount} ${fileText} shared with ${totalRecipients} recipients.`);

      // Reset form
      setSelectedClients([]);
      setSelectedGroups([]);
      setShareMessage("");
      setOpen(false);
      
    } catch (error) {
      console.error('Share error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('missing required ID field')) {
        toast.error('Some files cannot be shared due to missing data. Please refresh the page and try again.');
      } else {
        toast.error(error.message || 'Failed to share files');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {files && files.length > 1 
              ? `Share ${files.length} Files` 
              : `Share: ${file?.title || files?.[0]?.title}`
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Select Options */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect("all-active")}
              >
                All Active Clients
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect("all-clients")}
              >
                All Clients
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect("all-groups")}
              >
                All Groups
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect("clear")}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Recipients</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search clients or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Recipients Selection */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individuals">
                <User className="h-4 w-4 mr-2" />
                Individual Clients
              </TabsTrigger>
              <TabsTrigger value="groups">
                <Users className="h-4 w-4 mr-2" />
                Groups
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="individuals" className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-muted-foreground">Loading clients...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-destructive">{error}</span>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-muted-foreground">No clients found</span>
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <Card key={client.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={() => handleClientToggle(client.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {client.email ? client.email : 'No email provided'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={client.type?.toLowerCase() === "personal" ? "default" : "secondary"}>
                                  {client.type || 'Personal'}
                                </Badge>
                                <Badge variant={client.status === "Active" ? "default" : "secondary"}>
                                  {client.status || 'Active'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="groups" className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-muted-foreground">Loading groups...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-destructive">{error}</span>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-muted-foreground">No groups found</span>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <Card key={group.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedGroups.includes(group.id)}
                            onCheckedChange={() => handleGroupToggle(group.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{group.name}</p>
                                <p className="text-sm text-muted-foreground">{group.memberCount || 0} members</p>
                              </div>
                              <Badge variant="outline">{group.focusArea || 'General'}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Files to Share Summary */}
          {(files && files.length > 0) || file ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Files to Share</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {(files || [file]).map((f, index) => (
                    <Badge key={f.id || f.title || `file-${index}`} variant="outline">
                      {f.title}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Selected Recipients Summary */}
          {(selectedClients.length > 0 || selectedGroups.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedClients.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Individual Clients ({selectedClients.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedClients.map(clientId => {
                        const client = clients.find(c => c.id === clientId);
                        return (
                          <Badge key={clientId} variant="secondary">
                            {client?.name || 'Unknown Client'}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedGroups.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Groups ({selectedGroups.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedGroups.map(groupId => {
                        const group = groups.find(g => g.id === groupId);
                        return (
                          <Badge key={groupId} variant="secondary">
                            {group?.name || 'Unknown Group'} ({group?.memberCount || 0} members)
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Share Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Share Message (Optional)</Label>
            <Textarea
              id="message"
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Add a personal message to accompany this shared file..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={sharing}>
              {sharing ? "Sharing..." : "Share File"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}