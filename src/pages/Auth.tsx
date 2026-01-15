import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import logo from "@/assets/wealthora-logo.png";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Password reset flow states
type ResetStep = 'email' | 'verify' | 'newPassword' | 'success';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [signupPassword, setSignupPassword] = useState("");
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const referrerId = searchParams.get("ref");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resending, setResending] = useState(false);
  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session && event === 'SIGNED_IN') {
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;
    const firstName = formData.get("first-name") as string;
    const otherNames = formData.get("other-names") as string;
    const phone = formData.get("phone") as string;
    const country = formData.get("country") as string;
    const dob = formData.get("dob") as string;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: passwordValidation.errors[0]
      });
      setIsLoading(false);
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: firstName,
            other_names: otherNames,
            phone,
            country,
            date_of_birth: dob
          }
        }
      });
      if (error) {
        if (error.message.includes('fetch')) {
          throw new Error('Unable to connect to authentication service. Please check your Cloud configuration.');
        }
        throw error;
      }
      if (data?.user?.identities?.length === 0) {
        toast({
          variant: "destructive",
          title: "Account already exists",
          description: "This email is already registered. Please sign in instead."
        });
        return;
      }

      // Send confirmation email via edge function
      if (data?.user) {
        const confirmationLink = `${window.location.origin}/auth?confirmed=true`;
        await supabase.functions.invoke('send-signup-email', {
          body: {
            email,
            firstName,
            confirmationLink
          }
        });

        // Save referral relationship if ref param exists
        if (referrerId && referrerId !== data.user.id) {
          await supabase.from("referrals").insert({
            referrer_id: referrerId,
            referred_id: data.user.id
          });
        }
      }
      toast({
        title: "Success!",
        description: "Please check your email to verify your account."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("signin-email") as string;
    const password = formData.get("signin-password") as string;
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        if (error.message.includes('fetch')) {
          throw new Error('Unable to connect to authentication service. Please check your Cloud configuration.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw error;
      }

      // Check user role and redirect accordingly
      if (data.user) {
        const {
          data: roleData
        } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
        if (roleData) {
          toast({
            title: "Welcome Admin!",
            description: "Redirecting to admin dashboard..."
          });
          navigate("/admin");
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in."
          });
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = () => {
    const email = (document.getElementById("signin-email") as HTMLInputElement)?.value;
    if (email) {
      setResetEmail(email);
    }
    setShowPasswordReset(true);
    setResetStep('email');
  };

  const handleSendResetCode = async () => {
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address."
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-code', {
        body: { email: resetEmail }
      });

      if (error) throw error;

      if (data?.success) {
        setMaskedEmail(data.email || resetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'));
        setResetStep('verify');
        toast({
          title: "Code Sent",
          description: "A verification code has been sent to your email."
        });
      } else {
        throw new Error(data?.error || 'Failed to send code');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-code', {
        body: { email: resetEmail }
      });

      if (error) throw error;

      if (data?.success) {
        setResetCode("");
        toast({
          title: "New Code Sent",
          description: "A new verification code has been sent to your email."
        });
      } else {
        throw new Error(data?.error || 'Failed to resend code');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (resetCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code."
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-password-reset', {
        body: { email: resetEmail, code: resetCode }
      });

      if (error) throw error;

      if (data?.verified) {
        setResetStep('newPassword');
        toast({
          title: "Code Verified",
          description: "Please enter your new password."
        });
      } else {
        throw new Error(data?.error || 'Invalid verification code');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: passwordValidation.errors[0]
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-password-reset', {
        body: { email: resetEmail, code: resetCode, newPassword }
      });

      if (error) throw error;

      if (data?.passwordUpdated) {
        setResetStep('success');
        toast({
          title: "Password Updated",
          description: "Your password has been reset successfully."
        });
      } else {
        throw new Error(data?.error || 'Failed to reset password');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowPasswordReset(false);
    setResetStep('email');
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setMaskedEmail("");
  };
  if (session) {
    return null;
  }

  // Password Reset Flow UI
  if (showPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-glow">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
                alt="Wealthora ai" 
                className="h-[80px] w-auto drop-shadow-lg dark:drop-shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300" 
              />
            </div>
            <CardTitle className="text-2xl">
              {resetStep === 'email' && 'Reset Password'}
              {resetStep === 'verify' && 'Enter Verification Code'}
              {resetStep === 'newPassword' && 'Create New Password'}
              {resetStep === 'success' && 'Password Reset Complete'}
            </CardTitle>
            <CardDescription>
              {resetStep === 'email' && 'Enter your email to receive a verification code'}
              {resetStep === 'verify' && `Enter the 6-digit code sent to ${maskedEmail}`}
              {resetStep === 'newPassword' && 'Choose a strong password for your account'}
              {resetStep === 'success' && 'You can now sign in with your new password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetStep === 'email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email Address
                  </Label>
                  <Input 
                    id="reset-email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required 
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSendResetCode} 
                  disabled={isLoading || !resetEmail}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><KeyRound className="mr-2 h-4 w-4" /> Send Verification Code</>
                  )}
                </Button>
              </>
            )}

            {resetStep === 'verify' && (
              <>
                <div className="flex justify-center py-4">
                  <InputOTP 
                    maxLength={6} 
                    value={resetCode} 
                    onChange={(value) => setResetCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Code expires in 10 minutes
                </p>
                <Button 
                  className="w-full" 
                  onClick={handleVerifyCode} 
                  disabled={isLoading || resetCode.length !== 6}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><ShieldCheck className="mr-2 h-4 w-4" /> Verify Code</>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-sm" 
                  onClick={handleResendCode}
                  disabled={resending}
                >
                  {resending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resending...</>
                  ) : (
                    "Didn't receive the code? Resend"
                  )}
                </Button>
              </>
            )}

            {resetStep === 'newPassword' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">
                    <Lock className="h-4 w-4 inline mr-2" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input 
                      id="new-password" 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required 
                      className="pr-10"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPassword(!showNewPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword && <PasswordStrengthIndicator password={newPassword} />}
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleResetPassword} 
                  disabled={isLoading || !newPassword}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" /> Reset Password</>
                  )}
                </Button>
              </>
            )}

            {resetStep === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-muted-foreground">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>
                <Button className="w-full" onClick={handleBackToLogin}>
                  Sign In
                </Button>
              </div>
            )}

            {resetStep !== 'success' && (
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-glow">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="Wealthora ai" 
              className="h-[100px] w-auto drop-shadow-lg dark:drop-shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-105" 
            />
          </div>
          
          <CardDescription>
            Secure access to your AI-powered trading platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </Label>
                  <Input id="signin-email" name="signin-email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input id="signin-password" name="signin-password" type={showSigninPassword ? "text" : "password"} required className="pr-10" />
                    <button type="button" onClick={() => setShowSigninPassword(!showSigninPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button type="button" variant="link" className="w-full text-sm text-muted-foreground" onClick={handleForgotPassword} disabled={isLoading}>
                  Forgot your password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" name="first-name" type="text" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="other-names">Other Names</Label>
                    <Input id="other-names" name="other-names" type="text" placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </Label>
                  <Input id="signup-email" name="signup-email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" type="text" placeholder="United States" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" name="dob" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input id="signup-password" name="signup-password" type={showSignupPassword ? "text" : "password"} required value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupPassword && <PasswordStrengthIndicator password={signupPassword} />}
                </div>
                <div className="text-xs text-muted-foreground bg-warning/10 border border-warning/20 rounded p-3">
                  <strong>Risk Warning:</strong> Trading carries significant risk. Crypto transactions are irreversible. Returns are not guaranteed.
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}