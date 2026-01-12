"use client"

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "@/app/context/LanguageContext";
import { LanguageSelector } from "@/app/components/LanguageSelector";

const loginImage = "/assets/mobile-web-dashboard.png";
export default function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [isClient, setIsClient] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFAUserId, setTwoFAUserId] = useState(null);
  
  // Registration form state
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerStep, setRegisterStep] = useState(1); // 1 = basic info, 2 = questionnaire
  
  // Questionnaire state
  const [expectedPlatformBestAt, setExpectedPlatformBestAt] = useState("");
  const [currentClientsPerMonth, setCurrentClientsPerMonth] = useState("");
  const [currentPlatform, setCurrentPlatform] = useState("");

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle redirect when authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("session", session);
      // Redirect based on user role
      if (session.user.role === 'admin') {
        router.push("/admin/dashboard");
      } else if (session.user.role === 'coach') {
        router.push("/coach/dashboard");
      } else if (session.user.role === 'client') {
        router.push("/client/dashboard");
      } else {
        router.push("/coach/dashboard"); // Default fallback
      }
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg">{t('login.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Don't render the form if already authenticated
  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg">{t('login.redirecting', 'Redirecting to dashboard...')}</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      // Normalize email to lowercase before sending
      const normalizedEmail = loginEmail.toLowerCase().trim();
      
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password: loginPassword,
        twoFactorToken: (requires2FA && twoFactorToken && twoFactorToken.trim()) ? twoFactorToken.trim() : undefined,
        redirect: false,
      });

      if (result?.error) {
        // Handle 2FA-specific errors - check for exact match or includes
        const errorMsg = String(result.error || '');
        console.log('Login error received:', errorMsg, 'Full result:', result);
        
        // Check for subscription required errors
        if (errorMsg.includes("SUBSCRIPTION_REQUIRED:")) {
          const subscriptionMessage = errorMsg.replace("SUBSCRIPTION_REQUIRED:", "").trim();
          toast.error(`💳 ${subscriptionMessage}`, { duration: 8000 });
          // Optionally redirect to subscription page or show link
          return;
        }

        // Check for access denied (client's coach subscription inactive)
        if (errorMsg.includes("ACCESS_DENIED:")) {
          const accessMessage = errorMsg.replace("ACCESS_DENIED:", "").trim();
          toast.error(`🚫 ${accessMessage}`, { duration: 8000 });
          return;
        }

        // Check for 2FA verification required FIRST, before other checks
        if (errorMsg.includes("2FA_VERIFICATION_REQUIRED") || errorMsg.includes("VERIFICATION_REQUIRED")) {
          console.log('Detected 2FA_VERIFICATION_REQUIRED - showing 2FA input');
          setRequires2FA(true);
          toast.info(`🔒 ${t('login.success.enter2FACode', 'Please enter your 2FA code')}`, { duration: 5000 });
          return;
        }
        
        // Handle other error messages
        console.log('Login error (not 2FA related):', result.error);
        if (result.error === "Invalid email" || result.error.includes("Invalid email")) {
          toast.error(`❌ ${t('login.errors.emailNotFound', 'Email not found. Please check your email address.')}`, { duration: 5000 });
        } else if (result.error === "Invalid password" || result.error.includes("Invalid password")) {
          toast.error(`❌ ${t('login.errors.incorrectPassword', 'Incorrect password. Please try again.')}`, { duration: 5000 });
        } else if (result.error === "User is not active" || result.error.includes("not active")) {
          toast.error(`❌ ${t('login.errors.accountDeactivated', 'Account is deactivated. Please contact support.')}`, { duration: 5000 });
        } else if (result.error.includes("Invalid 2FA code")) {
          // If we get "Invalid 2FA code" but user has 2FA enabled, they might need to enter code
          // Check if this is the first attempt (no 2FA field shown yet)
          if (!requires2FA) {
            console.log('Got Invalid 2FA code but 2FA field not shown - showing it now');
            setRequires2FA(true);
            toast.info(`🔒 ${t('login.success.enter2FACode', 'Please enter your 2FA code')}`, { duration: 5000 });
            return;
          } else {
            toast.error(`❌ ${t('login.errors.invalid2FA', 'Invalid 2FA code. Please try again.')}`, { duration: 5000 });
          }
        } else {
          toast.error(`❌ ${t('login.errors.invalidCredentials', 'Invalid email or password. Please try again.')}`, { duration: 5000 });
        }
      } else if (result?.ok) {
        toast.success(`✅ ${t('login.success.loginSuccessful', 'Login successful! Redirecting...')}`, { duration: 3000 });
        // Reset 2FA state
        setRequires2FA(false);
        setTwoFactorToken("");
        setTwoFAUserId(null);
        // The redirect will be handled by the useEffect above
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`❌ ${t('login.errors.errorOccurred', 'An error occurred during login. Please try again.')}`, { duration: 5000 });
    } finally {
      setLoginLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    // Accept either 6-digit TOTP code OR 8-character backup code
    const isValidCode = (twoFactorToken && 
      (twoFactorToken.length === 6 || twoFactorToken.length === 8));
    
    if (!isValidCode) {
      toast.error(`❌ ${t('login.twoFactorHelp', 'Please enter a 6-digit code from your app or an 8-character backup code')}`, { duration: 5000 });
      return;
    }

    setLoginLoading(true);
    
    try {
      const normalizedEmail = loginEmail.toLowerCase().trim();
      
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password: loginPassword,
        twoFactorToken: twoFactorToken.toUpperCase().trim(), // Uppercase for backup codes
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("2FA") || result.error.includes("Invalid")) {
          toast.error(`❌ ${t('login.errors.invalid2FA', 'Invalid 2FA code. Please try again.')}`, { duration: 5000 });
          setTwoFactorToken(""); // Clear invalid code
        } else {
          toast.error(`❌ ${t('login.errors.invalidCredentials', 'Authentication failed. Please try again.')}`, { duration: 5000 });
        }
      } else if (result?.ok) {
        toast.success(`✅ ${t('login.success.loginSuccessful', 'Login successful! Redirecting...')}`, { duration: 3000 });
        setRequires2FA(false);
        setTwoFactorToken("");
        setTwoFAUserId(null);
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      toast.error(`❌ ${t('login.errors.errorOccurred', 'An error occurred. Please try again.')}`, { duration: 5000 });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (registerPassword !== confirmPassword) {
      toast.error(`❌ ${t('login.errors.passwordsNotMatch', 'Passwords do not match')}`, { duration: 5000 });
      return;
    }

    // Validate password length
    if (registerPassword.length < 8) {
      toast.error(`❌ ${t('login.errors.passwordTooShort', 'Password must be at least 8 characters long')}`, { duration: 5000 });
      return;
    }
    
    // Move to questionnaire step
    setRegisterStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    
    // Validate questionnaire fields
    if (!expectedPlatformBestAt.trim()) {
      toast.error(`❌ ${t('login.errors.answerAllQuestions', 'Please answer all questions')}`, { duration: 5000 });
      setRegisterLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email: registerEmail,
          password: registerPassword,
          phone,
          role: "coach",
          expectedPlatformBestAt,
          currentClientsPerMonth: currentClientsPerMonth ? parseInt(currentClientsPerMonth) : null,
          currentPlatform: currentPlatform || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      toast.success(`✅ ${t('login.success.registrationSuccessful', "Registration successful! We'll review your application and notify you via email.")}`, { duration: 5000 });
      setActiveTab("login");
      
      // Clear form
      setName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");
      setPhone("");
      setExpectedPlatformBestAt("");
      setCurrentClientsPerMonth("");
      setCurrentPlatform("");
      setRegisterStep(1);
      
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(`❌ ${error.message || t('login.errors.registrationFailed', 'Registration failed')}`, { duration: 5000 });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 pl-8">
          <div className="space-y-6">
            
            <div className="items-start gap-3">
              <div className="w-48 rounded-xl flex items-center justify-center overflow-hidden">
                <img 
                  src="/assets/logo.png" 
                  alt="Suplient Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Login Image */}
            <div className="relative w-full max-w-md mb-6">
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-border/50">
                <img 
                  src={loginImage} 
                  alt="Mental Health Support" 
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            
            <div className="space-y-5 max-w-lg">
            <h1 className="text-3xl mt-6 md:text-3xl lg:text-3xl font-bold tracking-tight">
              {(() => {
                const title = t('login.heroTitle', 'Scale your impact keep the human touch');
                const words = title.split(' ');
                // For English (6 words): highlight last 3 words "keep the human touch" (index 3, 4, 5)
                // For Danish (7 words): highlight last 4 words "uden at miste nærværet" (index 3, 4, 5, 6)
                // Highlight from index 3 onwards for both languages
                const highlightStart = 3;
                return words.map((word, index) => {
                  if (index >= highlightStart) {
                    return <span key={index} className="text-primary"> {word}</span>;
                  }
                  return <span key={index}> {word}</span>;
                });
              })()}
            </h1>
            <p className="text-xl text-muted-foreground">{t('login.heroDescription', 'Deliver personal 1:1 and group programs, support hundreds of clients in parallel and track real progress -without stress, burnout or extra hours.')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center lg:justify-end lg:pr-8">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="space-y-4 pb-6">
              <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="/assets/logo.png" 
                    alt="Suplient Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-2xl font-bold">Suplient</h1>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-center flex-1">
                  <Link 
                    href="https://suplient.com/" 
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    {t('login.goToHomepage', 'Go to homepage')} →
                  </Link>
                </div>
                <div className="flex-1 flex justify-end">
                  <LanguageSelector variant="header" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">{t('login.welcomeBack', 'Welcome Back')}</CardTitle>
              <CardDescription className="text-center">
                {t('login.signInDescription', 'Sign in to your account to continue your mental health journey')}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t('login.signIn', 'Sign In')}</TabsTrigger>
                  <TabsTrigger value="register">{t('login.coachSignUp', 'Coach Sign Up')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  {!requires2FA ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="loginEmail">{t('login.email', 'Email')}</Label>
                        <Input
                          id="loginEmail"
                          type="email"
                          placeholder={t('login.emailPlaceholder', 'Enter your email')}
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          className="h-11"
                          disabled={loginLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="loginPassword">{t('login.password', 'Password')}</Label>
                        <div className="relative">
                          <Input
                            id="loginPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            className="h-11 pr-10"
                            disabled={loginLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loginLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                          {t('login.forgotPassword', 'Forgot password?')}
                        </Link>
                      </div>
                      
                      <Button type="submit" className="w-full h-11" disabled={loginLoading}>
                        {loginLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('login.signingIn', 'Signing in...')}
                          </>
                        ) : (
                          t('login.signIn', 'Sign In')
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handle2FASubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="twoFactorToken">{t('login.twoFactorAuth', 'Two-Factor Authentication Code')}</Label>
                        <Input
                          id="twoFactorToken"
                          type="text"
                          placeholder={t('login.twoFactorPlaceholder', 'Enter 6-digit code or 8-character backup code')}
                          value={twoFactorToken}
                          onChange={(e) => {
                            // Allow alphanumeric, uppercase, max 8 characters
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                            setTwoFactorToken(value);
                          }}
                          required
                          className="h-11 text-center text-2xl tracking-widest font-mono"
                          maxLength={8}
                          autoFocus
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {t('login.twoFactorHelp', 'Enter the 6-digit code from your authenticator app, or an 8-character backup code')}
                        </p>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRequires2FA(false);
                            setTwoFactorToken("");
                            setTwoFAUserId(null);
                          }}
                          disabled={loginLoading}
                        >
                          {t('login.back', '← Back')}
                        </Button>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-11" 
                        disabled={loginLoading || !twoFactorToken || (twoFactorToken.length !== 6 && twoFactorToken.length !== 8)}
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('login.verifying', 'Verifying...')}
                          </>
                        ) : (
                          t('login.verifyAndSignIn', 'Verify & Sign In')
                        )}
                      </Button>
                    </form>
                  )}
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4">
                  {registerStep === 1 ? (
                    <form onSubmit={handleNextStep} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('login.fullName', 'Full Name')}</Label>
                        <Input
                          id="name"
                          placeholder={t('login.fullNamePlaceholder', 'John Doe')}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="registerEmail">{t('login.email', 'Email')}</Label>
                        <Input
                          id="registerEmail"
                          type="email"
                          placeholder={t('login.emailPlaceholder', 'Enter your email')}
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('login.phoneNumber', 'Phone Number')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t('login.phonePlaceholder', '+1 (555) 123-4567')}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="registerPassword">{t('login.password', 'Password')}</Label>
                        <div className="relative">
                          <Input
                            id="registerPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder={t('login.createPassword', 'Create a password (min. 8 characters)')}
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            required
                            className="h-11 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('login.confirmPassword', 'Confirm Password')}</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t('login.confirmPasswordPlaceholder', 'Confirm your password')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="h-11 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full h-11">
                        {t('login.next', 'Next')}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          {t('login.step2Of2', 'Step 2 of 2: Tell us about yourself')}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRegisterStep(1)}
                          className="p-0 h-auto text-xs"
                        >
                          {t('login.back', '← Back')}
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expectedPlatformBestAt">
                          {t('login.expectedPlatformBestAt', 'What do you expect this platform to be the best at? *')}
                        </Label>
                        <textarea
                          id="expectedPlatformBestAt"
                          placeholder={t('login.expectedPlatformPlaceholder', "Tell us what you're looking for in a coaching platform...")}
                          value={expectedPlatformBestAt}
                          onChange={(e) => setExpectedPlatformBestAt(e.target.value)}
                          required
                          rows={4}
                          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="currentClientsPerMonth">
                          {t('login.currentClientsPerMonth', 'How many clients do you currently have per month?')}
                        </Label>
                        <Input
                          id="currentClientsPerMonth"
                          type="number"
                          min="0"
                          placeholder={t('login.currentClientsPlaceholder', 'e.g., 10')}
                          value={currentClientsPerMonth}
                          onChange={(e) => setCurrentClientsPerMonth(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="currentPlatform">
                          {t('login.currentPlatform', 'Which platform are you currently using if any?')}
                        </Label>
                        <Input
                          id="currentPlatform"
                          type="text"
                          placeholder={t('login.currentPlatformPlaceholder', 'e.g., Calendly, Zoom, Google Calendar, etc.')}
                          value={currentPlatform}
                          onChange={(e) => setCurrentPlatform(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      
                      <Button type="submit" className="w-full h-11" disabled={registerLoading}>
                        {registerLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('login.creatingAccount', 'Creating account...')}
                          </>
                        ) : (
                          t('login.createCoachAccount', 'Create Coach Account')
                        )}
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {t('login.termsAndPrivacy', 'By continuing, you agree to our')}{" "}
                <Link href="https://suplient.com/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t('login.termsOfService', 'Terms of Service')}
                </Link>{" "}
                {t('login.and', 'and')}{" "}
                <Link href="https://suplient.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t('login.privacyPolicy', 'Privacy Policy')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}