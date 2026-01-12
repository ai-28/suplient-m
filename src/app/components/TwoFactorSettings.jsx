"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Loader2, Shield, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
import { useRouter } from "next/navigation";

export function TwoFactorSettings() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [twoFAStatus, setTwoFAStatus] = useState({
    has2FA: false,
    needsSetup: false,
    isPlatformRequired: false
  });
  const [disabling, setDisabling] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetch2FAStatus();
    }
  }, [session]);

  const fetch2FAStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/2fa/status");
      const data = await response.json();

      if (data.success) {
        setTwoFAStatus({
          has2FA: data.has2FA,
          needsSetup: data.needsSetup,
          isPlatformRequired: data.isPlatformRequired
        });
      }
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      toast.error("Failed to load 2FA status");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = () => {
    router.push("/setup-2fa");
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("2FA disabled successfully");
        setShowDisableDialog(false);
        fetch2FAStatus();
      } else {
        toast.error(data.error || "Failed to disable 2FA");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {twoFAStatus.has2FA ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">2FA is enabled</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">2FA is disabled</span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {twoFAStatus.has2FA
                  ? "Your account is protected with two-factor authentication"
                  : "Enable 2FA to secure your account"}
              </p>
            </div>

            <div className="flex gap-2">
              {twoFAStatus.has2FA ? (
                <Button
                  variant="outline"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button onClick={handleEnable}>
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          {twoFAStatus.isPlatformRequired && twoFAStatus.has2FA && (
            <p className="text-xs text-muted-foreground">
              ⚠️ 2FA is required by platform administrator and cannot be disabled
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable 2FA? This will make your account less secure.
              You can re-enable it at any time in your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

