"use client"

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  User,
  Loader2,
  Ban,
  LogIn
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/context/LanguageContext";

export default function AdminClients() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const t = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    coachId: "",
    notes: "",
    password: ""
  });

  // Fetch clients and coaches from API
  useEffect(() => {
    fetchClients();
    fetchCoaches();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/clients');
      const data = await response.json();
      
      if (data.success) {
        setClients(data.clients);
      } else {
        console.error('Failed to fetch clients:', data.error);
        toast.error(t('clients.errorLoadingClients'), {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error(t('clients.errorLoadingClients'), {
        description: t('common.messages.pleaseWait')
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoaches = async () => {
    try {
      const response = await fetch('/api/admin/assigned-coaches');
      const data = await response.json();
      
      if (data.success) {
        setCoaches(data.coaches);
      } else {
        console.error('Failed to fetch coaches:', data.error);
      }
    } catch (error) {
      console.error('Error fetching coaches:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoach = !coachFilter || coachFilter === "all" || client.coachId === coachFilter;
    return matchesSearch && matchesCoach;
  });

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Add the new client to the list
          setClients([...clients, data.client]);
          setIsCreateOpen(false);
          setFormData({ name: "", email: "", phone: "", location: "", coachId: "", notes: "", password: "" });
          toast.success(t('clients.clientCreated'), {
            description: `${data.client.name} has been added to the platform.`
          });
      } else {
        console.error('Failed to create client:', data.error);
        toast.error('Failed to create client', {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Error creating client', {
        description: 'Please try again.'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (selectedClient) {
      try {
        setUpdating(true);
        const updateData = {
          id: selectedClient.id,
          ...formData
        };
        // Only include password if it's provided (not empty)
        if (!formData.password || formData.password.trim() === '') {
          delete updateData.password;
        }
        const response = await fetch('/api/admin/clients', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (data.success) {
          // Update the client in the list
          setClients(clients.map(client => 
            client.id === selectedClient.id ? data.client : client
          ));
          setIsEditOpen(false);
          setSelectedClient(null);
          setFormData({ name: "", email: "", phone: "", location: "", coachId: "", notes: "", password: "" });
          toast.success(t('clients.clientUpdated'), {
            description: `${data.client.name}'s profile has been updated.`
          });
        } else {
          console.error('Failed to update client:', data.error);
          toast.error(t('common.messages.operationFailed'), {
            description: data.error
          });
        }
      } catch (error) {
        console.error('Error updating client:', error);
        toast.error(t('common.messages.operationFailed'), {
          description: t('common.messages.pleaseWait')
        });
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleDelete = async (clientId) => {
    try {
      const response = await fetch(`/api/admin/clients?id=${clientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove the client from the list
        setClients(clients.filter(client => client.id !== clientId));
        toast.success(t('clients.clientDeleted'), {
          description: data.message
        });
      } else {
        console.error('Failed to delete client:', data.error);
        toast.error(t('common.messages.operationFailed'), {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error(t('common.messages.operationFailed'), {
        description: t('common.messages.pleaseWait')
      });
    }
  };

  const handleSuspend = async (clientId, currentStatus) => {
    try {
      setSuspending(true);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const action = newStatus === 'inactive' ? 'suspend' : 'activate';
      
      const response = await fetch('/api/admin/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: clientId,
          status: newStatus
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the client in the list
        setClients(clients.map(client => 
          client.id === clientId ? { ...client, status: newStatus } : client
        ));
        toast.success(`Client ${action}ed successfully!`, {
          description: `Client status changed to ${newStatus}.`
        });
      } else {
        console.error(`Failed to ${action} client:`, data.error);
        toast.error(`Failed to ${action} client`, {
          description: data.error
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing client:`, error);
      toast.error(`Error ${action}ing client`, {
        description: 'Please try again.'
      });
    } finally {
      setSuspending(false);
    }
  };

  const openEditDialog = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      location: client.location,
      coachId: client.coachId,
      notes: client.notes,
      password: "" // Always reset password field when dialog opens
    });
    setIsEditOpen(true);
  };

  const handleLoginAs = async (client) => {
    try {
      setImpersonating(true);
      
      // client.id is the User ID (from GET /api/admin/clients response)
      // This is what we need for impersonation
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: client.id // This is the User table ID
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update session to start impersonation
        await update({
          impersonate: {
            targetUserId: data.targetUser.id,
            targetUserRole: data.targetUser.role,
            targetUserName: data.targetUser.name,
            targetUserEmail: data.targetUser.email
          }
        });

        toast.success('Impersonation started', {
          description: `You are now viewing as ${data.targetUser.name}`
        });

        // Redirect to dashboard based on role
        if (data.targetUser.role === 'coach') {
          router.push('/coach/dashboard');
        } else if (data.targetUser.role === 'client') {
          router.push('/client/dashboard');
        }
      } else {
        throw new Error(data.error || 'Failed to start impersonation');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast.error('Failed to start impersonation', {
        description: error.message
      });
    } finally {
      setImpersonating(false);
    }
  };

  return (
    <div className={`space-y-6 ${isMobile ? 'px-2' : ''}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold tracking-tight break-words`}>{t('clients.title')}</h1>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>
            {t('clients.title')}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
              <Plus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              {t('clients.addClient')}
            </Button>
          </DialogTrigger>
          <DialogContent className={isMobile ? 'max-w-full mx-2' : 'sm:max-w-[500px]'}>
            <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
              <DialogTitle className={isMobile ? 'text-base' : ''}>{t('clients.createClient')}</DialogTitle>
              <DialogDescription className={isMobile ? 'text-xs break-words' : 'break-words'}>
                {t('clients.createClient')}
              </DialogDescription>
            </DialogHeader>
            <div className={isMobile ? 'space-y-3 px-4' : 'space-y-4'}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
                <div>
                  <Label htmlFor="name" className={isMobile ? 'text-xs' : ''}>{t('common.labels.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className={isMobile ? 'text-xs' : ''}>{t('common.labels.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
                <div>
                  <Label htmlFor="phone" className={isMobile ? 'text-xs' : ''}>{t('common.labels.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="location" className={isMobile ? 'text-xs' : ''}>{t('clients.location')}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
                <div>
                  <Label htmlFor="coach" className={isMobile ? 'text-xs' : ''}>{t('clients.assignedCoach')}</Label>
                  <Select value={formData.coachId} onValueChange={(value) => setFormData({...formData, coachId: value})}>
                    <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                      <SelectValue placeholder={t('common.labels.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className={isMobile ? 'text-xs' : ''}>{t('clients.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder={t('clients.notes')}
                  className={isMobile ? 'text-xs min-h-[60px]' : ''}
                />
              </div>
            </div>
            <DialogFooter className={isMobile ? 'flex-col gap-2 px-4 pb-3' : ''}>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
                {t('common.buttons.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.email || !formData.coachId || creating} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
                {creating ? (
                  <>
                    <Loader2 className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} animate-spin`} />
                    {t('common.messages.loading')}
                  </>
                ) : (
                  t('clients.createClient')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('clients.searchClients')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={coachFilter || undefined} onValueChange={setCoachFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('clients.filterByCoach')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('clients.allCoaches')}</SelectItem>
            {coaches.map((coach) => (
              <SelectItem key={coach.id} value={coach.id}>
                {coach.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <div className={isMobile ? 'p-0 w-[340px] h-[500px] overflow-scroll' : 'overflow-y-scroll h-[700px]'}>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('common.labels.name')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('common.labels.email')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('common.labels.phone')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('navigation.coaches')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('common.labels.status')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('clients.location')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('common.labels.lastLogin')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('navigation.sessions')}</TableHead>
                    <TableHead className={isMobile ? 'text-xs px-2' : ''}>{t('common.labels.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
                  <p className={`${isMobile ? 'text-xs' : ''} text-muted-foreground break-words`}>{t('clients.loadingClients')}</p>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
                  <p className={`${isMobile ? 'text-xs' : ''} text-muted-foreground break-words`}>{t('clients.noClients')}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className={`font-medium ${isMobile ? 'text-xs px-2' : ''} break-words`}>{client.name}</TableCell>
                  <TableCell className={isMobile ? 'text-xs px-2 break-words' : 'break-words'}>{client.email}</TableCell>
                  <TableCell className={isMobile ? 'text-xs px-2 break-words' : 'break-words'}>{client.phone}</TableCell>
                  <TableCell className={isMobile ? 'text-xs px-2 break-words' : 'break-words'}>{client.coachName}</TableCell>
                  <TableCell className={isMobile ? 'px-2' : ''}>
                    <Badge variant={client.status === "active" ? "default" : "secondary"} className={isMobile ? 'text-[10px] px-1.5 py-0.5' : ''}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={isMobile ? 'text-xs px-2 break-words' : 'break-words'}>{client.location}</TableCell>
                  <TableCell className={isMobile ? 'text-xs px-2 break-words' : 'break-words'}>
                    {client.lastLoginDate 
                      ? new Date(client.lastLoginDate).toLocaleDateString() 
                      : 'Never'}
                  </TableCell>
                  <TableCell className={isMobile ? 'text-xs px-2' : ''}>{client.sessionsCount}</TableCell>
                  <TableCell className={isMobile ? 'px-2' : ''}>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "sm"}
                        onClick={() => handleLoginAs(client)}
                        disabled={impersonating}
                        title="Login as this client"
                        className={isMobile ? 'h-6 w-6 p-0' : ''}
                      >
                        {impersonating ? (
                          <Loader2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} animate-spin`} />
                        ) : (
                          <LogIn className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "sm"}
                        onClick={() => openEditDialog(client)}
                        className={isMobile ? 'h-6 w-6 p-0' : ''}
                      >
                        <Edit className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </Button>
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "sm"}
                        onClick={() => handleSuspend(client.id, client.status)}
                        disabled={suspending}
                        className={`${client.status === "active" ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"} ${isMobile ? 'h-6 w-6 p-0' : ''}`}
                      >
                        {suspending ? (
                          <Loader2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} animate-spin`} />
                        ) : (
                          <Ban className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size={isMobile ? "sm" : "sm"} className={`text-destructive hover:text-destructive ${isMobile ? 'h-6 w-6 p-0' : ''}`}>
                            <Trash2 className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className={isMobile ? 'max-w-full mx-2' : ''}>
                          <AlertDialogHeader className={isMobile ? 'px-4 py-3' : ''}>
                            <AlertDialogTitle className={isMobile ? 'text-base' : ''}>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription className={isMobile ? 'text-xs break-words' : 'break-words'}>
                              This action cannot be undone. This will permanently delete the client
                              and remove their data from the platform.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className={isMobile ? 'flex-col gap-2 px-4 pb-3' : ''}>
                            <AlertDialogCancel className={isMobile ? 'w-full text-xs h-8' : ''}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(client.id)} className={isMobile ? 'w-full text-xs h-8' : ''}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
                </TableBody>
              </Table>
            </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className={isMobile ? 'max-w-full mx-2' : 'sm:max-w-[500px]'}>
          <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
            <DialogTitle className={isMobile ? 'text-base' : ''}>Edit Client</DialogTitle>
            <DialogDescription className={isMobile ? 'text-xs break-words' : 'break-words'}>
              Update client information
            </DialogDescription>
          </DialogHeader>
          <div className={isMobile ? 'space-y-3 px-4' : 'space-y-4'}>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
              <div>
                <Label htmlFor="edit-name" className={isMobile ? 'text-xs' : ''}>Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
              <div>
                <Label htmlFor="edit-email" className={isMobile ? 'text-xs' : ''}>Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
            </div>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
              <div>
                <Label htmlFor="edit-phone" className={isMobile ? 'text-xs' : ''}>Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
              <div>
                <Label htmlFor="edit-location" className={isMobile ? 'text-xs' : ''}>Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
            </div>
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="edit-password" className={isMobile ? 'text-xs' : ''}>New Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Leave empty to keep current password"
                className={isMobile ? 'text-xs h-8' : ''}
              />
            </div>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
              <div>
                <Label htmlFor="edit-coach" className={isMobile ? 'text-xs' : ''}>Assigned Coach</Label>
                <Select value={formData.coachId} onValueChange={(value) => setFormData({...formData, coachId: value})}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder="Select a coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes" className={isMobile ? 'text-xs' : ''}>Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
                className={isMobile ? 'text-xs min-h-[60px]' : ''}
              />
            </div>
          </div>
          <DialogFooter className={isMobile ? 'flex-col gap-2 px-4 pb-3' : ''}>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={updating} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || !formData.email || !formData.coachId || updating} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
              {updating ? (
                <>
                  <Loader2 className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} animate-spin`} />
                  Updating...
                </>
              ) : (
                'Update Client'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}