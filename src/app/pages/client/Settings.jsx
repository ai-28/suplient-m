"use client"

import { useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Separator } from "@/app/components/ui/separator";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { useTranslation } from "@/app/context/LanguageContext";
import { TwoFactorSettings } from "@/app/components/TwoFactorSettings";
import { useTimeFormat } from "@/app/contexts/TimeFormatContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Key,
  LogOut,
  UserX
} from "lucide-react";

export default function ClientSettings() {
  const { data: session } = useSession();
  const t = useTranslation();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    calendar: true
  });
  const [deactivating, setDeactivating] = useState(false);

  const handleTimeFormatChange = (value) => {
    setTimeFormat(value);
    toast({
      title: "Time Format Updated",
      description: "Your time format preference has been saved successfully.",
    });
  };

  const handleDeactivateProfile = async () => {
    if (!session?.user?.id) {
      toast.error(t('common.messages.mustBeLoggedIn', 'You must be logged in to deactivate your profile'));
      return;
    }

    try {
      setDeactivating(true);
      const response = await fetch('/api/user/deactivate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('settings.deactivate.success', 'Profile deactivated successfully'));
        // Sign out after deactivation
        setTimeout(() => {
          signOut({ callbackUrl: '/login' });
        }, 2000);
      } else {
        toast.error(data.error || t('settings.deactivate.failed', 'Failed to deactivate profile'));
      }
    } catch (error) {
      console.error('Error deactivating profile:', error);
      toast.error(t('settings.deactivate.failed', 'Failed to deactivate profile'));
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            {t('navigation.settings', 'Settings')}
          </h2>
          <p className="text-muted-foreground mt-1">{t('settings.title', 'Manage your settings')}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('settings:tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('settings:tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('settings:tabs.security')}
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Settings */}
            <div className="lg:col-span-2">
              <LanguageSelector />
            </div>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t('settings:profile.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline">{t('common:buttons.edit')}</Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF (max. 2MB)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('settings:profile.fullName')}</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t('settings:profile.email')}</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>

                <div>
                  <Label htmlFor="phone">{t('settings:profile.phone')}</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>

                <div>
                  <Label htmlFor="timezone">{t('settings:profile.timezone')}</Label>
                  <Input id="timezone" defaultValue="Eastern Time (UTC-5)" />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('settings:profile.timeFormat')}
                  </Label>
                  <Select value={timeFormat} onValueChange={handleTimeFormatChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">{t('settings:profile.timeFormat24h')}</SelectItem>
                      <SelectItem value="12h">{t('settings:profile.timeFormat12h')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">{t('common:buttons.save')}</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="shadow-soft border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                {t('settings:notifications.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <Label>{t('settings:notifications.emailNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">Receive session reminders and updates via email</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.email} 
                  onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <Label>{t('settings:notifications.pushNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">Get instant notifications in your browser</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.push} 
                  onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <Label>{t('settings:notifications.smsNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">Receive critical updates via text message</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.sms} 
                  onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="shadow-soft border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                {t('settings:security.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>

              <Button className="w-full">{t('settings:security.changePassword')}</Button>
            </CardContent>
          </Card>

          <TwoFactorSettings />
        </TabsContent>
      </Tabs>

      {/* Deactivate Profile and Logout Section */}
      <div className="mt-8 pt-6 border-t border-border space-y-4">
        {/* Deactivate Profile */}
        <Card className="card-standard">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-primary" />
              {t('settings.deactivate.title', 'Deactivate Profile')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('settings.deactivate.description', 'Deactivating your profile will disable your account. You can contact your coach to reactivate it later.')}
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={deactivating}>
                    <UserX className="h-4 w-4" />
                    {t('settings.deactivate.button', 'Deactivate Profile')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.deactivate.confirmTitle', 'Deactivate Profile')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('settings.deactivate.confirmDescription', 'Are you sure you want to deactivate your profile? Your account will be disabled and you will be signed out. You can contact your coach to reactivate it later.')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeactivateProfile}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deactivating}
                    >
                      {deactivating ? t('common.messages.loading') : t('settings.deactivate.confirmButton', 'Deactivate')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card className="card-standard">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('settings.logout.title', 'Log Out')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.logout.description', 'Sign out of your account')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t('settings.logout.button', 'Log Out')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}