"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Separator } from "@/app/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { 
  User, 
  Settings as SettingsIcon,
  Camera,
  X,
  Loader2,
  Bell,
  Globe,
  LogOut,
  CreditCard,
  CheckCircle,
  TrendingUp
} from "lucide-react";

import { useTranslation } from "@/app/context/LanguageContext";
import { TwoFactorSettings } from "@/app/components/TwoFactorSettings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

function AdminBillingTab() {
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [coachSubscriptions, setCoachSubscriptions] = useState([]);
  const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, activeSubscriptions: 0 });

  useEffect(() => {
    fetchCoachSubscriptions();
  }, []);

  const fetchCoachSubscriptions = async () => {
    try {
      setLoading(true);
      // Fetch all coach subscriptions
      const response = await fetch('/api/admin/coaches/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setCoachSubscriptions(data.subscriptions || []);
        
        // Calculate revenue
        const total = data.subscriptions?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;
        const thisMonth = data.subscriptions?.filter(sub => {
          const periodEnd = new Date(sub.currentPeriodEnd);
          const now = new Date();
          return periodEnd >= now && periodEnd <= new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }).reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;
        const active = data.subscriptions?.filter(sub => sub.status === 'active').length || 0;
        
        setRevenue({ total, thisMonth, activeSubscriptions: active });
      }
    } catch (error) {
      console.error('Error fetching coach subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{revenue.total.toFixed(2)} DKK</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{revenue.thisMonth.toFixed(2)} DKK</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{revenue.activeSubscriptions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coach Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Coach Subscriptions</CardTitle>
          <CardDescription>View all coach subscriptions to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading subscriptions...</span>
            </div>
          ) : coachSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No coach subscriptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">{subscription.coachName}</TableCell>
                      <TableCell>{subscription.coachEmail}</TableCell>
                      <TableCell>
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{subscription.amount?.toFixed(2) || '0.00'} DKK</TableCell>
                      <TableCell>
                        {subscription.currentPeriodEnd 
                          ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {subscription.createdAt 
                          ? new Date(subscription.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformSettingsTab({ notificationsEnabled, handleNotificationToggle }) {
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState({
    platformName: 'Mental Coach Platform',
    supportEmail: 'support@mentalcoach.com',
    maxClientsPerCoach: 20,
    language: 'en'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  const fetchPlatformSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/platform/settings');
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
        toast.error(t('common.messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('common.messages.saveSuccess'));
        // Reload page to update top bar
        window.location.reload();
      } else {
        toast.error(data.error || t('settings.general.saveFailed', 'Failed to save platform settings'));
      }
    } catch (error) {
      console.error('Error saving platform settings:', error);
      toast.error(t('settings.general.saveFailed', 'Failed to save platform settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`animate-spin text-muted-foreground ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
      </div>
    );
  }

  return (
    <div className={`grid ${isMobile ? 'gap-3' : 'gap-6'}`}>
      {/* General Settings */}
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
          <CardTitle className={isMobile ? 'text-sm' : ''}>{t('settings.general.title')}</CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>{t('settings.general.description')}</CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'space-y-3 px-2 pb-2' : 'space-y-4'}>
          <div className={isMobile ? 'space-y-1.5' : 'grid gap-2'}>
            <Label htmlFor="platform-name" className={isMobile ? 'text-xs' : ''}>{t('settings.general.platformName')}</Label>
            <Input 
              id="platform-name" 
              value={settings.platformName}
              onChange={(e) => setSettings({...settings, platformName: e.target.value})}
              disabled={saving}
              className={isMobile ? 'text-xs h-8' : ''}
            />
          </div>
          <div className={isMobile ? 'space-y-1.5' : 'grid gap-2'}>
            <Label htmlFor="support-email" className={isMobile ? 'text-xs' : ''}>{t('settings.general.supportEmail')}</Label>
            <Input 
              id="support-email" 
              type="email" 
              value={settings.supportEmail}
              onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
              disabled={saving}
              className={isMobile ? 'text-xs h-8' : ''}
            />
          </div>
          <div className={isMobile ? 'space-y-1.5' : 'grid gap-2'}>
            <Label htmlFor="max-clients" className={isMobile ? 'text-xs' : ''}>{t('settings.general.maxClients')}</Label>
            <Input 
              id="max-clients" 
              type="number" 
              min="1"
              value={settings.maxClientsPerCoach}
              onChange={(e) => setSettings({...settings, maxClientsPerCoach: parseInt(e.target.value) || 1})}
              disabled={saving}
              className={isMobile ? 'text-xs h-8' : ''}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
            <Globe className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
            {t('settings.language.title', 'Language')}
          </CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>{t('settings.language.description', 'Choose your preferred language')}</CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
          <LanguageSelector />
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
            <Bell className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
            {t('settings.notifications.title', 'Notification Settings')}
          </CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>{t('settings.notifications.description', 'Choose what notifications you receive')}</CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
          <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-2' : 'justify-between'}`}>
            <div className={isMobile ? 'space-y-0.5 flex-1' : 'space-y-0.5'}>
              <Label className={isMobile ? 'text-xs' : ''}>{t('settings.notifications.enable', 'Enable Notifications')}</Label>
              <p className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-sm'} break-words`}>
                {t('settings.notifications.description', 'Receive notifications for messages, tasks, sessions, and updates')}
              </p>
            </div>
            <Switch 
              checked={notificationsEnabled} 
              onCheckedChange={handleNotificationToggle}
              disabled={saving}
              className={isMobile ? 'mt-1' : ''}
            />
          </div>
        </CardContent>
      </Card>

      <div className={`flex ${isMobile ? 'flex-col-reverse gap-2' : 'justify-end space-x-4'}`}>
        <Button variant="outline" onClick={fetchPlatformSettings} disabled={saving} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
          {t('common.buttons.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={saving} className={isMobile ? 'w-full text-xs h-8' : ''} size={isMobile ? "sm" : "default"}>
          {saving ? (
            <>
              <Loader2 className={`animate-spin ${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
              {t('common.messages.loading')}
            </>
            ) : (
            t('common.buttons.save')
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { data: session } = useSession();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch admin data on component mount
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        const data = await response.json();

        if (data.success && data.user) {
          setAdminData(data.user);
          setFormData({
            fullName: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || ''
          });
          
          // Set avatar preview if exists
          if (data.user.avatar) {
            setAvatarPreview(data.user.avatar);
          }

          // Load notification preference from database
          if (data.user.notificationsEnabled !== undefined) {
            setNotificationsEnabled(data.user.notificationsEnabled !== false);
            // Also sync to localStorage for backward compatibility
            if (typeof window !== 'undefined') {
              localStorage.setItem('notificationsEnabled', (data.user.notificationsEnabled !== false).toString());
            }
          } else {
            // Fallback to localStorage if database doesn't have it yet
            if (typeof window !== 'undefined') {
              const savedNotificationPreference = localStorage.getItem('notificationsEnabled');
              if (savedNotificationPreference !== null) {
                setNotificationsEnabled(savedNotificationPreference === 'true');
              }
            }
          }
        } else {
          toast.error(t('common.messages.loadFailed', 'Failed to load admin data'));
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error(t('common.messages.loadFailed', 'Failed to load admin data'));
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [session?.user?.id]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle avatar file selection
  const handleAvatarFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Check if file is HEIC/HEIF
      const isHeic = file.type === 'image/heic' || 
                     file.type === 'image/heif' || 
                     file.name.toLowerCase().endsWith('.heic') || 
                     file.name.toLowerCase().endsWith('.heif');

      let fileToUse = file;

      // Convert HEIC to JPEG if needed
      if (isHeic) {
        try {
          // Dynamically import heic2any only on client side
          if (typeof window === 'undefined') {
            toast.error('HEIC conversion is not available on server side');
            return;
          }
          
          const heic2any = (await import('heic2any')).default;
          toast.info('Converting HEIC image to JPEG...', { duration: 2000 });
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9
          });
          
          // heic2any returns an array, get the first item
          const convertedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          
          // Create a File object from the blob
          fileToUse = new File([convertedFile], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          toast.success('HEIC image converted successfully', { duration: 2000 });
        } catch (conversionError) {
          const errorDetails = {
            message: conversionError.message,
            name: conversionError.name,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          };
          console.error('Error converting HEIC:', errorDetails);
          toast.error('Failed to convert HEIC image', {
            description: conversionError.message || 'Please try converting it to JPEG first, or use a different image format.'
          });
          return;
        }
      }

      // Validate file type (after conversion)
      if (!fileToUse.type.startsWith('image/')) {
        const fileSizeMB = (fileToUse.size / (1024 * 1024)).toFixed(2);
        const errorDetails = `File type: ${fileToUse.type || 'unknown'}, Size: ${fileSizeMB}MB, Name: ${fileToUse.name}`;
        console.error('Invalid file type:', errorDetails);
        toast.error(`Invalid file type (${fileToUse.type || 'unknown'}). Please select a JPG, PNG, WebP, GIF, or HEIC image.`, {
          description: `File: ${fileToUse.name} (${fileSizeMB}MB)`
        });
        return;
      }

      // Validate file size (10MB max)
      if (fileToUse.size > 10 * 1024 * 1024) {
        const fileSizeMB = (fileToUse.size / (1024 * 1024)).toFixed(2);
        const errorDetails = `File: ${fileToUse.name}, Type: ${fileToUse.type}, Size: ${fileSizeMB}MB (max: 10MB)`;
        console.error('File too large:', errorDetails);
        toast.error(`Image too large (${fileSizeMB}MB). Maximum size is 10MB.`, {
          description: `Please compress or resize your image. File: ${fileToUse.name}`
        });
        return;
      }

      // Store the file for upload
      setSelectedFile(fileToUse);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(fileToUse);
    } catch (error) {
      const errorDetails = {
        message: error.message,
        name: error.name,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size
      };
      console.error('Error processing image:', errorDetails, error);
      toast.error('Failed to process image', {
        description: error.message || 'An unexpected error occurred. Please try again or use a different image.'
      });
    }
  };

  // Upload file using presigned URL (bypasses Next.js body size limit)
  const uploadWithPresignedUrl = async (presignedUrl, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Set timeout (5 minutes for avatar uploads)
      xhr.timeout = 5 * 60 * 1000;

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    // Use the selected file (which may have been converted from HEIC)
    const file = selectedFile;
    
    if (!file) {
      toast.error(t('settings.profile.selectImageFile', 'Please select an image file'));
      return;
    }

    try {
      setUploadingAvatar(true);

      // Step 1: Get presigned URL
      const initiateResponse = await fetch('/api/user/avatar/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });

      if (!initiateResponse.ok) {
        let errorMessage = t('settings.profile.avatarUploadFailed', 'Failed to upload avatar');
        let errorDetails = null;
        
        try {
          const errorData = await initiateResponse.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || null;
        } catch (e) {
          errorMessage = `${t('settings.profile.avatarUploadFailed', 'Failed to upload avatar')} (${initiateResponse.status} ${initiateResponse.statusText})`;
        }
        
        toast.error(errorMessage, {
          description: errorDetails || `File: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
        });
        return;
      }

      const initiateResult = await initiateResponse.json();
      
      if (!initiateResult.success) {
        toast.error(initiateResult.error || t('settings.profile.avatarUploadFailed', 'Failed to upload avatar'), {
          description: initiateResult.details || `File: ${file.name}`
        });
        return;
      }

      // Step 2: Upload file directly to S3 using presigned URL
      await uploadWithPresignedUrl(
        initiateResult.presignedUrl,
        file,
        (progress) => {
          // Optional: Update progress if needed
          console.log(`Upload progress: ${progress.toFixed(0)}%`);
        }
      );

      // Step 3: Complete upload (update user record)
      const completeResponse = await fetch('/api/user/avatar/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: initiateResult.filePath,
        }),
      });

      if (!completeResponse.ok) {
        let errorMessage = t('settings.profile.avatarUploadFailed', 'Failed to upload avatar');
        try {
          const errorData = await completeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${t('settings.profile.avatarUploadFailed', 'Failed to upload avatar')} (${completeResponse.status})`;
        }
        toast.error(errorMessage);
        return;
      }

      const completeResult = await completeResponse.json();

      if (completeResult.success) {
        toast.success(t('settings.profile.avatarUploaded', 'Avatar uploaded successfully!'));
        // Clear selected file and preview
        setSelectedFile(null);
        setAvatarPreview(null);
        // Clear file input
        const fileInput = document.getElementById('avatar-upload-admin');
        if (fileInput) fileInput.value = '';
        // Update admin data with new avatar
        setAdminData(prev => ({
          ...prev,
          avatar: completeResult.avatarUrl
        }));
        // Refresh session to get updated avatar
        if (typeof window !== 'undefined') {
          // Small delay to ensure state is updated before reload
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } else {
        toast.error(completeResult.error || t('settings.profile.avatarUploadFailed', 'Failed to upload avatar'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      let errorMessage = t('settings.profile.avatarUploadFailed', 'Failed to upload avatar');
      let errorDescription = null;
      
      if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
        errorMessage = 'Network error';
        errorDescription = 'Please check your internet connection and try again.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Connection failed';
        errorDescription = 'Unable to connect to server. Please check your connection and try again later.';
      } else if (error.message) {
        errorMessage = error.message;
        errorDescription = `File: ${file?.name || 'unknown'}`;
      } else {
        errorDescription = `File: ${file?.name || 'unknown'}. Please try again.`;
      }
      
      toast.error(errorMessage, {
        description: errorDescription
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle avatar removal
  const handleAvatarRemove = async () => {
    try {
      setUploadingAvatar(true);

      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('settings.profile.avatarRemoved', 'Avatar removed successfully!'));
        setAvatarPreview(null);
        // Update admin data
        setAdminData(prev => ({
          ...prev,
          avatar: null
        }));
        // Refresh session
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        toast.error(data.error || t('settings.profile.avatarRemoveFailed', 'Failed to remove avatar'));
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error(t('settings.profile.avatarRemoveFailed', 'Failed to remove avatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = async (enabled) => {
    setNotificationsEnabled(enabled);
    
    try {
      // Save notification preference to database
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          notificationsEnabled: enabled
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Also save to localStorage for backward compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('notificationsEnabled', enabled.toString());
        }
        
        toast.success(
          enabled ? t('settings.notifications.enabled', 'Notifications enabled') : t('settings.notifications.disabled', 'Notifications disabled'),
          {
            description: enabled 
              ? t('settings.notifications.enabledDescription', "You'll receive notifications for messages, tasks, and sessions")
              : t('settings.notifications.disabledDescription', "You won't receive any notifications")
          }
        );
      } else {
        throw new Error(data.error || t('settings.notifications.saveFailed', 'Failed to save notification preference'));
      }
    } catch (error) {
      console.error('Error saving notification preference:', error);
      toast.error(t('settings.notifications.saveFailed', 'Failed to save notification preference'));
      // Revert state on error
      setNotificationsEnabled(!enabled);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!session?.user?.id) {
      toast.error(t('common.messages.mustBeLoggedIn', 'You must be logged in to save changes'));
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          email: formData.email,
          phone: formData.phone
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('settings.profile.profileUpdated', 'Profile updated successfully!'));
        // Update admin data with new values
        setAdminData(prev => ({
          ...prev,
          name: formData.fullName.trim(),
          email: formData.email,
          phone: formData.phone
        }));
      } else {
        toast.error(data.error || t('settings.profile.profileUpdateFailed', 'Failed to update profile'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('settings.profile.profileUpdateFailed', 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-8 ${isMobile ? 'px-4 pb-24' : ''}`}>
      <div>
        <h1 className={`font-bold tracking-tight ${isMobile ? 'text-xl' : 'text-3xl'}`}>{t('navigation.settings')}</h1>
        <p className={`text-muted-foreground ${isMobile ? 'text-xs mt-1' : 'mt-2'}`}>
          {t('settings.title')}
        </p>
      </div>

      <Tabs defaultValue="profile" className={isMobile ? 'space-y-4' : 'space-y-6'}>
        <TabsList className={`grid w-full grid-cols-3 bg-muted ${isMobile ? 'h-auto p-1' : ''}`}>
          <TabsTrigger value="profile" className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}>
            {t('profile.title')}
          </TabsTrigger>
          <TabsTrigger value="platform" className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}>
            {t('settings.general.title')}
          </TabsTrigger>
          <TabsTrigger value="billing" className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}>
            {t('settings.billing.title', 'Billing')}
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className={isMobile ? 'px-0' : ''}>
          <div className={`grid grid-cols-1 lg:grid-cols-1 ${isMobile ? 'gap-3' : 'gap-6'}`}>
            <Card className={`card-standard ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
              <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  <User className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
                  {t('profile.personalInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? 'space-y-3 px-2 pb-2' : 'space-y-4'}>
                <div className={`flex items-center ${isMobile ? 'flex-col gap-3 mb-4' : 'gap-4 mb-6'}`}>
                  <div className="relative">
                    <Avatar className={isMobile ? 'h-16 w-16' : 'h-20 w-20'}>
                      {avatarPreview || adminData?.avatar ? (
                        <AvatarImage 
                          src={avatarPreview || adminData?.avatar} 
                          alt={adminData?.name || 'Profile'} 
                          key={adminData?.avatar || 'no-avatar'} 
                        />
                      ) : null}
                      <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-base' : 'text-xl'}`}>
                        {adminData?.name ? 
                          adminData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                          'AD'
                        }
                      </AvatarFallback>
                    </Avatar>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-full">
                        <Loader2 className={`animate-spin text-primary ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                      </div>
                    )}
                  </div>
                  <div className={`flex-1 ${isMobile ? 'w-full' : ''}`}>
                    <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                      <input
                        type="file"
                        id="avatar-upload-admin"
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        onChange={handleAvatarFileSelect}
                        disabled={uploadingAvatar}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (typeof document !== 'undefined') {
                            document.getElementById('avatar-upload-admin')?.click();
                          }
                        }}
                        disabled={uploadingAvatar}
                        className={isMobile ? 'text-xs h-8 px-2' : ''}
                        size={isMobile ? "sm" : "default"}
                      >
                        <Camera className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                        {avatarPreview ? t('settings.profile.changePhoto', 'Change Photo') : t('settings.profile.uploadPhoto', 'Upload Photo')}
                      </Button>
                      {avatarPreview && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={handleAvatarUpload}
                            disabled={uploadingAvatar}
                            className={isMobile ? 'text-xs h-8 px-2' : ''}
                            size={isMobile ? "sm" : "default"}
                          >
                            {uploadingAvatar ? (
                              <>
                                <Loader2 className={`animate-spin ${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                                {t('common.messages.loading')}
                              </>
                            ) : (
                              t('common.buttons.save')
                            )}
                          </Button>
                          <Button 
                            variant="ghost"
                            size={isMobile ? "sm" : "sm"}
                            onClick={() => {
                              setAvatarPreview(adminData?.avatar || null);
                              setSelectedFile(null);
                              if (typeof document !== 'undefined') {
                                const fileInput = document.getElementById('avatar-upload-admin');
                                if (fileInput) fileInput.value = '';
                              }
                            }}
                            disabled={uploadingAvatar}
                            className={isMobile ? 'h-8 w-8 p-0' : ''}
                          >
                            <X className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                          </Button>
                        </>
                      )}
                      {adminData?.avatar && !avatarPreview && (
                        <Button 
                          variant="ghost"
                          size={isMobile ? "sm" : "sm"}
                          onClick={handleAvatarRemove}
                          disabled={uploadingAvatar}
                          className={isMobile ? 'text-xs h-8 px-2' : ''}
                        >
                          {t('common.buttons.remove')}
                        </Button>
                      )}
                    </div>
                    <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-[10px]' : 'text-xs'} break-words`}>
                      {t('settings.profile.avatarFormat', 'JPG, PNG, WebP, GIF, or HEIC. Max 10MB. HEIC files will be automatically converted to JPEG.')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="fullName" className={isMobile ? 'text-xs' : ''}>{t('common.labels.name')}</Label>
                  <Input 
                    id="fullName" 
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={loading}
                    placeholder={t('common.labels.name')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="email" className={isMobile ? 'text-xs' : ''}>{t('common.labels.email')}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    placeholder={t('common.labels.email')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className={isMobile ? 'text-xs' : ''}>{t('common.labels.phone')}</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={loading}
                    placeholder={t('common.labels.phone')}
                    className={isMobile ? 'text-xs h-8' : ''}
                  />
                </div>

                <Button 
                  className={`w-full ${isMobile ? 'text-xs h-8' : ''}`} 
                  onClick={handleSaveChanges}
                  disabled={loading || saving}
                  size={isMobile ? "sm" : "default"}
                >
                  {saving ? t('common.messages.loading') : t('common.buttons.saveChanges')}
                </Button>
              </CardContent>
            </Card>
            
            {/* Two-Factor Authentication Settings */}
            <TwoFactorSettings />
          </div>
          
        </TabsContent>

        {/* Platform Settings */}
        <TabsContent value="platform">
          <PlatformSettingsTab 
            notificationsEnabled={notificationsEnabled}
            handleNotificationToggle={handleNotificationToggle}
          />
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing">
          <AdminBillingTab />
        </TabsContent>
      </Tabs>

      {/* Logout Section */}
      <div className={`${isMobile ? 'mt-4 pt-4' : 'mt-8 pt-6'} border-t border-border`}>
        <Card className={`card-standard ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
          <CardContent className={isMobile ? 'pt-4 px-2 pb-2' : 'pt-6'}>
            <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-3' : 'justify-between'}`}>
              <div className={isMobile ? 'flex-1' : ''}>
                <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-lg'}`}>{t('settings.logout.title', 'Log Out')}</h3>
                <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>
                  {t('settings.logout.description', 'Sign out of your account')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={`gap-2 ${isMobile ? 'w-full text-xs h-8' : ''}`}
                size={isMobile ? "sm" : "default"}
              >
                <LogOut className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                {t('settings.logout.button', 'Log Out')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}