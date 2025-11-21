import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import logo from "@/assets/wealthora-logo.png";
export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [signupPassword, setSignupPassword] = useState("");
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
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
  const handleForgotPassword = async () => {
    const email = (document.getElementById("signin-email") as HTMLInputElement)?.value;
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address first."
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });
      if (error) throw error;

      // Send password reset email via edge function
      const resetLink = `${window.location.origin}/auth?reset=true`;
      await supabase.functions.invoke('send-reset-email', {
        body: {
          email,
          resetLink
        }
      });
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link."
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
  if (session) {
    return null;
  }
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-glow">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Wealthora ai" className="h-16 w-auto" />
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
    </div>;
}