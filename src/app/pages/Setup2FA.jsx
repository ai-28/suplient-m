"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Loader2, Shield, CheckCircle2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

export default function Setup2FA() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      initializeSetup();
    }
  }, [status, session]);

  const initializeSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/2fa/setup");
      const data = await response.json();

      if (data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } else {
        toast.error("Failed to initialize 2FA setup");
        router.push("/login");
      }
    } catch (error) {
      console.error("Error initializing 2FA setup:", error);
      toast.error("An error occurred. Please try again.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    if (!secret) {
      toast.error("Setup error: Secret not found. Please refresh the page and try again.");
      console.error("2FA verify: Secret is missing");
      return;
    }

    setVerifying(true);

    try {
      console.log("2FA verify: Sending request", {
        hasSecret: !!secret,
        secretLength: secret?.length,
        token: verificationCode,
        tokenLength: verificationCode.length
      });

      const response = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          token: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("2FA verify: API error", { status: response.status, data });
        toast.error(data.error || "Invalid code. Please try again.");
        setVerificationCode("");
        return;
      }

      if (data.success) {
        setBackupCodes(data.backupCodes);
        setSetupComplete(true);
        toast.success("2FA enabled successfully!");
      } else {
        toast.error(data.error || "Invalid code. Please try again.");
        setVerificationCode("");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCodesCopied(true);
    toast.success("Backup codes copied to clipboard!");
    setTimeout(() => setCodesCopied(false), 3000);
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded!");
  };

  const handleContinue = () => {
    // Redirect based on user role
    if (session?.user?.role === 'admin') {
      router.push("/admin/dashboard");
    } else if (session?.user?.role === 'coach') {
      router.push("/coach/dashboard");
    } else if (session?.user?.role === 'client') {
      router.push("/client/dashboard");
    } else {
      router.push("/");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">2FA Setup Complete!</CardTitle>
            <CardDescription>
              Your account is now protected with two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Save these backup codes in a safe place. 
                You can use them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Your Backup Codes</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBackupCodes}
                    disabled={codesCopied}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {codesCopied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadBackupCodes}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="font-mono text-sm text-center p-2 bg-background rounded border"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Each code can only be used once. Generate new codes if you run out.
              </p>
            </div>

            <Button onClick={handleContinue} className="w-full" size="lg">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Set Up Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Scan the QR code with your authenticator app to enable 2FA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy
              </p>
              
              {qrCode && (
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-lg border-2 border-border">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Can't scan the QR code?</strong></p>
                <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                  {secret}
                </p>
                <p className="text-xs">Enter this code manually in your authenticator app</p>
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <div>
                <Label htmlFor="verificationCode">Enter Verification Code</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter the 6-digit code from your authenticator app to verify setup
                </p>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleVerify}
                className="w-full"
                size="lg"
                disabled={verifying || verificationCode.length !== 6}
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable 2FA"
                )}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push("/login")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

