"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { PageHeader } from "@/app/components/PageHeader";
import { UserCog, Mail, Shield, UserPlus, Edit, Trash2, Crown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { useTranslation } from "@/app/context/LanguageContext";

export default function AdminUsers() {
  const { data: session } = useSession();
  const t = useTranslation();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [updatingAdmin, setUpdatingAdmin] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(false);
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
    name: '',
    email: '',
    password: '',
    phone: '',
    isSuperAdmin: false,
    isActive: true,
  });
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/admins');
        const data = await response.json();
        
        if (data.success) {
          setAdmins(data.admins || []);
          // Check if current user is super admin
          const currentUser = data.admins.find(a => a.id === session?.user?.id);
          setCurrentUserIsSuperAdmin(currentUser?.isSuperAdmin || false);
        } else {
          toast.error(t('common.messages.error'));
        }
      } catch (error) {
        console.error('Error fetching admins:', error);
        toast.error(t('common.messages.error'));
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchAdmins();
    }
  }, [session]);

  const handleCreateAdmin = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error(t('adminUsers.fillRequiredFields'));
      return;
    }

    setCreatingAdmin(true);

    try {
      const response = await fetch('/api/admin/admins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('adminUsers.adminCreated'));
        setShowCreateDialog(false);
        setFormData({ name: '', email: '', password: '', phone: '', isSuperAdmin: false, isActive: true });
        // Refresh admins list
        const refreshResponse = await fetch('/api/admin/admins');
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setAdmins(refreshData.admins || []);
        }
      } else {
        toast.error(data.error || t('common.messages.error'));
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error(t('common.messages.error'));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    // Check if user is updating their own account
    const isUpdatingSelf = selectedAdmin.id === session?.user?.id;

    // Validate password changes if password edit is shown
    if (showPasswordEdit) {
      // Always require current password for security verification
      if (!passwordData.currentPassword) {
        toast.error(t('adminUsers.currentPasswordRequired'));
        return;
      }

      // Check if new password is provided
      if (passwordData.newPassword || passwordData.confirmPassword) {
        if (passwordData.newPassword.length < 8) {
          toast.error(t('adminUsers.passwordMinLength'));
          return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast.error(t('adminUsers.passwordsDoNotMatch'));
          return;
        }
      } else {
        // If password fields are shown but empty, that's okay - just don't update password
        // Clear the password data to avoid sending empty strings
        passwordData.newPassword = '';
        passwordData.currentPassword = '';
        passwordData.confirmPassword = '';
      }
    }

    setUpdatingAdmin(true);

    try {
      const updateData = {
        ...formData,
        password: passwordData.newPassword,
        currentPassword: passwordData.currentPassword, // Always send current password for verification
      };

      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      // Handle error responses (400, 403, 404, 500, etc.)
      if (!response.ok || !data.success) {
        // Show specific error message from backend
        const errorMessage = data.error || 'Failed to update admin';
        
        // Special handling for password errors
        if (errorMessage.includes('password')) {
          toast.error(errorMessage, { duration: 5000 });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      // Success case
      toast.success(t('adminUsers.adminUpdated'));
      setShowEditDialog(false);
      setSelectedAdmin(null);
      setFormData({ name: '', email: '', password: '', phone: '', isSuperAdmin: false, isActive: true });
      setShowPasswordEdit(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Refresh admins list
      const refreshResponse = await fetch('/api/admin/admins');
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        setAdmins(refreshData.admins || []);
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error(t('common.messages.error'));
    } finally {
      setUpdatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    setDeletingAdmin(true);

    try {
      const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('adminUsers.adminDeleted'));
        setShowDeleteDialog(false);
        setSelectedAdmin(null);
        // Refresh admins list
        const refreshResponse = await fetch('/api/admin/admins');
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setAdmins(refreshData.admins || []);
        }
      } else {
        toast.error(data.error || t('common.messages.error'));
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error(t('common.messages.error'));
    } finally {
      setDeletingAdmin(false);
    }
  };

  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      phone: admin.phone || '',
      isSuperAdmin: admin.isSuperAdmin,
      isActive: admin.isActive,
    });
    setShowPasswordEdit(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (admin) => {
    setSelectedAdmin(admin);
    setShowDeleteDialog(true);
  };

  const canEditAdmin = (admin) => {
    // Super admins can edit anyone
    if (currentUserIsSuperAdmin) return true;
    // Regular admins cannot edit super admins
    if (admin.isSuperAdmin) return false;
    return true;
  };

  const canDeleteAdmin = (admin) => {
    // Cannot delete yourself
    if (admin.id === session?.user?.id) return false;
    // Super admins can delete anyone
    if (currentUserIsSuperAdmin) return true;
    // Regular admins cannot delete super admins
    if (admin.isSuperAdmin) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title={t('navigation.adminUsers')} 
        subtitle={t('navigation.adminUsers')}
      >
        {currentUserIsSuperAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className={`gap-2 ${isMobile ? 'w-full text-xs h-8' : ''}`} size={isMobile ? "sm" : "default"}>
                <UserPlus className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                {t('adminUsers.addAdmin', 'Add Admin')}
              </Button>
            </DialogTrigger>
            <DialogContent className={isMobile ? 'max-w-full mx-2' : ''}>
              <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
                <DialogTitle className={isMobile ? 'text-base' : ''}>{t('adminUsers.createAdmin', 'Create New Admin')}</DialogTitle>
              </DialogHeader>
              <div className={isMobile ? 'space-y-3 py-3 px-4' : 'space-y-4 py-4'}>
                <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                  <Label htmlFor="name" className={isMobile ? 'text-xs' : ''}>{t('common.labels.name')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('common.labels.name')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
                <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                  <Label htmlFor="email" className={isMobile ? 'text-xs' : ''}>{t('common.labels.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('common.labels.email')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
                <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                  <Label htmlFor="password" className={isMobile ? 'text-xs' : ''}>{t('settings.profile.newPassword')} *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('settings.profile.newPassword')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
                <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                  <Label htmlFor="phone" className={isMobile ? 'text-xs' : ''}>{t('common.labels.phone')} ({t('common.labels.optional', 'Optional')})</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('common.labels.phone')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>
                <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                  <Checkbox
                    id="isSuperAdmin"
                    checked={formData.isSuperAdmin}
                    onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked })}
                    className={isMobile ? 'h-4 w-4' : ''}
                  />
                  <Label htmlFor="isSuperAdmin" className={`cursor-pointer flex items-center gap-2 ${isMobile ? 'text-xs' : ''} break-words`}>
                    <Crown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-yellow-600`} />
                    {t('adminUsers.makeSuperAdmin', 'Make Super Admin')}
                  </Label>
                </div>
                <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    className={isMobile ? 'h-4 w-4' : ''}
                  />
                  <Label htmlFor="isActive" className={`cursor-pointer ${isMobile ? 'text-xs' : ''} break-words`}>
                    {t('adminUsers.activeAccount', 'Active Account')}
                  </Label>
                </div>
              </div>
              <div className={`flex ${isMobile ? 'flex-col-reverse gap-2' : 'justify-end gap-2'} ${isMobile ? 'px-4 pb-3' : ''}`}>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creatingAdmin} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button onClick={handleCreateAdmin} disabled={creatingAdmin} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
                  {creatingAdmin ? (
                    <>
                      <Loader2 className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} animate-spin`} />
                      {t('common.messages.loading')}
                    </>
                  ) : (
                    t('adminUsers.createAdmin', 'Create Admin')
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <Card className={`card-standard ${isMobile ? 'mt-2 p-0 shadow-none border-0' : 'mt-4'}`}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
            <UserCog className={`${isMobile ? 'h-3 w-3' : 'h-5 w-5'} text-primary`} />
            {t('adminUsers.administrators', 'Administrators')} ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
          <div className={isMobile ? 'space-y-1.5' : 'space-y-1'}>
            {/* Header Row - Hidden on mobile */}
            {!isMobile && (
              <div className="grid grid-cols-5 gap-4 p-4 text-sm font-medium text-muted-foreground bg-muted/30 rounded-lg">
                <div>{t('common.labels.name')}</div>
                <div>{t('common.labels.email')}</div>
                <div>{t('common.labels.role', 'Role')}</div>
                <div>{t('common.labels.status')}</div>
                <div>{t('common.labels.actions')}</div>
              </div>
            )}

            {/* Admin Rows */}
            {admins.length === 0 ? (
              <div className={`text-center ${isMobile ? 'py-4' : 'py-8'} ${isMobile ? 'text-xs' : ''} text-muted-foreground break-words`}>
                {t('adminUsers.noAdminUsers')}
              </div>
            ) : (
              admins.map((admin) => (
                <div 
                  key={admin.id} 
                  className={`${isMobile ? 'flex flex-col gap-2 p-2' : 'grid grid-cols-5 gap-4 p-4'} hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border`}
                >
                  <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                    <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} ${admin.isSuperAdmin ? 'bg-yellow-100' : 'bg-primary/10'} rounded-full flex items-center justify-center flex-shrink-0`}>
                      {admin.isSuperAdmin ? (
                        <Crown className={`${isMobile ? 'h-3 w-3' : 'h-5 w-5'} text-yellow-600`} />
                      ) : (
                        <Shield className={`${isMobile ? 'h-3 w-3' : 'h-5 w-5'} text-primary`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`${isMobile ? 'text-xs' : ''} font-medium break-words`}>{admin.name}</div>
                      {admin.id === session?.user?.id && (
                        <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>{t('adminUsers.you')}</div>
                      )}
                      {isMobile && (
                        <div className={`flex items-center gap-1.5 ${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1 break-words`}>
                          <Mail className={isMobile ? 'h-2.5 w-2.5' : 'h-4 w-4'} />
                          {admin.email}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isMobile && (
                    <div className="flex items-center">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {admin.email}
                      </div>
                    </div>
                  )}
                  <div className={`flex items-center ${isMobile ? 'gap-2' : ''}`}>
                    <Badge 
                      className={`${admin.isSuperAdmin 
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                      } ${isMobile ? 'text-[10px] px-1.5 py-0.5' : ''}`}
                    >
                      {admin.isSuperAdmin ? t('adminUsers.superAdmin') : t('adminUsers.admin')}
                    </Badge>
                    {isMobile && (
                      <Badge 
                        className={`${admin.isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                        } text-[10px] px-1.5 py-0.5`}
                      >
                        {admin.isActive ? t('common.status.active') : t('common.status.inactive')}
                      </Badge>
                    )}
                  </div>
                  {!isMobile && (
                    <div className="flex items-center">
                      <Badge 
                        className={`${admin.isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {admin.isActive ? t('common.status.active') : t('common.status.inactive')}
                      </Badge>
                    </div>
                  )}
                  <div className={`flex items-center ${isMobile ? 'gap-1.5 justify-end' : 'gap-2'}`}>
                    <Button 
                      size={isMobile ? "sm" : "sm"} 
                      variant="outline"
                      onClick={() => openEditDialog(admin)}
                      disabled={!canEditAdmin(admin)}
                      className={isMobile ? 'h-6 w-6 p-0' : ''}
                    >
                      <Edit className={isMobile ? 'h-2.5 w-2.5' : 'h-4 w-4'} />
                    </Button>
                    <Button 
                      size={isMobile ? "sm" : "sm"} 
                      variant="outline"
                      onClick={() => openDeleteDialog(admin)}
                      disabled={!canDeleteAdmin(admin)}
                      className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${isMobile ? 'h-6 w-6 p-0' : ''}`}
                    >
                      <Trash2 className={isMobile ? 'h-2.5 w-2.5' : 'h-4 w-4'} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className={isMobile ? 'max-w-full mx-2' : ''}>
          <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
            <DialogTitle className={isMobile ? 'text-base' : ''}>Edit Admin</DialogTitle>
          </DialogHeader>
          <div className={isMobile ? 'space-y-3 py-3 px-4' : 'space-y-4 py-4'}>
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="edit-name" className={isMobile ? 'text-xs' : ''}>Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={isMobile ? 'text-xs h-8' : ''}
              />
            </div>
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="edit-email" className={isMobile ? 'text-xs' : ''}>Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={isMobile ? 'text-xs h-8' : ''}
              />
            </div>
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="edit-phone" className={isMobile ? 'text-xs' : ''}>Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={isMobile ? 'text-xs h-8' : ''}
              />
            </div>
            
            {/* Password Update Section */}
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-1.5' : 'justify-between'}`}>
                <Label className={isMobile ? 'text-xs' : ''}>Password</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => {
                    setShowPasswordEdit(!showPasswordEdit);
                    if (showPasswordEdit) {
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }
                  }}
                  className={isMobile ? 'text-xs h-7 px-2' : ''}
                >
                  {showPasswordEdit ? 'Cancel' : 'Change Password'}
                </Button>
              </div>
               {showPasswordEdit && (
                 <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                   {/* Always show current password field for security */}
                   <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                     <Label htmlFor="current-password" className={isMobile ? 'text-xs break-words' : 'break-words'}>
                       Your Current Password * 
                       {selectedAdmin?.id !== session?.user?.id && (
                         <span className={`text-muted-foreground font-normal ${isMobile ? 'text-[10px]' : ''} break-words`}> (for verification)</span>
                       )}
                     </Label>
                     <Input
                       id="current-password"
                       type="password"
                       placeholder="Enter your current password"
                       value={passwordData.currentPassword}
                       onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                       className={isMobile ? 'text-xs h-8' : ''}
                     />
                   </div>
                   <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                     <Label htmlFor="new-password" className={isMobile ? 'text-xs break-words' : 'break-words'}>
                       New Password {selectedAdmin?.id !== session?.user?.id && `for ${selectedAdmin?.name}`} *
                     </Label>
                     <Input
                       id="new-password"
                       type="password"
                       placeholder="Enter new password (min. 8 characters)"
                       value={passwordData.newPassword}
                       onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                       className={isMobile ? 'text-xs h-8' : ''}
                     />
                   </div>
                   <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                     <Label htmlFor="confirm-password" className={isMobile ? 'text-xs' : ''}>Confirm New Password *</Label>
                     <Input
                       id="confirm-password"
                       type="password"
                       placeholder="Confirm new password"
                       value={passwordData.confirmPassword}
                       onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                       className={isMobile ? 'text-xs h-8' : ''}
                     />
                   </div>
                   <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                     {selectedAdmin?.id === session?.user?.id 
                       ? '🔒 Enter your current password to change your password.'
                       : `🔒 Enter YOUR current password to reset ${selectedAdmin?.name}'s password.`}
                   </p>
                 </div>
               )}
            </div>
            
            {currentUserIsSuperAdmin && (
              <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                <Checkbox
                  id="edit-isSuperAdmin"
                  checked={formData.isSuperAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked })}
                  className={isMobile ? 'h-4 w-4' : ''}
                />
                <Label htmlFor="edit-isSuperAdmin" className={`cursor-pointer flex items-center gap-2 ${isMobile ? 'text-xs' : ''} break-words`}>
                  <Crown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-yellow-600`} />
                  {t('adminUsers.makeSuperAdmin')}
                </Label>
              </div>
            )}
            <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
              <Checkbox
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                className={isMobile ? 'h-4 w-4' : ''}
              />
              <Label htmlFor="edit-isActive" className={`cursor-pointer ${isMobile ? 'text-xs' : ''} break-words`}>
                {t('adminUsers.activeAccount')}
              </Label>
            </div>
          </div>
          <div className={`flex ${isMobile ? 'flex-col-reverse gap-2' : 'justify-end gap-2'} ${isMobile ? 'px-4 pb-3' : ''}`}>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updatingAdmin} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleUpdateAdmin} disabled={updatingAdmin} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
              {updatingAdmin ? (
                <>
                  <Loader2 className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} animate-spin`} />
                  {t('common.messages.loading')}
                </>
              ) : (
                t('common.buttons.saveChanges')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className={isMobile ? 'max-w-full mx-2' : ''}>
          <AlertDialogHeader className={isMobile ? 'px-4 py-3' : ''}>
            <AlertDialogTitle className={isMobile ? 'text-base' : ''}>{t('common.buttons.delete')} {t('adminUsers.admin')}</AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? 'text-xs break-words' : 'break-words'}>
              {t('common.messages.confirmDelete', 'Are you sure you want to delete')} <strong>{selectedAdmin?.name}</strong>? 
              {t('common.messages.cannotUndo', 'This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? 'flex-col gap-2 px-4 pb-3' : ''}>
            <AlertDialogCancel disabled={deletingAdmin} className={isMobile ? 'w-full text-xs h-8' : ''}>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAdmin} 
              disabled={deletingAdmin}
              className={`bg-red-600 hover:bg-red-700 ${isMobile ? 'w-full text-xs h-8' : ''}`}
            >
              {deletingAdmin ? (
                <>
                  <Loader2 className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} animate-spin`} />
                  {t('common.messages.loading')}
                </>
              ) : (
                t('common.buttons.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

