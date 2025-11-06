import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, User, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ProfileData {
  first_name: string;
  other_names: string;
  email: string;
  phone: string;
  country: string;
  date_of_birth: string;
  avatar: string;
}

export default function ProfileView() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestedChanges, setRequestedChanges] = useState({
    first_name: "",
    other_names: "",
    phone: "",
    country: "",
    date_of_birth: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadProfileData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Profile error:", error);
      }

      if (data) {
        const profileData = {
          first_name: data.first_name || "",
          other_names: data.other_names || "",
          email: data.email || session?.user?.email || "",
          phone: data.phone || "",
          country: data.country || "",
          date_of_birth: data.date_of_birth || "",
          avatar: data.avatar || "",
        };
        setProfile(profileData);
        setRequestedChanges({
          first_name: profileData.first_name,
          other_names: profileData.other_names,
          phone: profileData.phone,
          country: profileData.country,
          date_of_birth: profileData.date_of_birth,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profile_change_requests")
        .insert({
          user_id: session.user.id,
          requested_changes: requestedChanges,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your profile change request has been sent to the admin for approval.",
      });
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                My Profile
              </CardTitle>
              <CardDescription>
                Your personal information (Read-only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile?.avatar && (
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar} alt="Profile avatar" />
                    <AvatarFallback>{profile.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.first_name || "Not set"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Other Names</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.other_names || "Not set"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.phone || "Not set"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.country || "Not set"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.date_of_birth || "Not set"}
                  </div>
                </div>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Request Profile Change
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Profile Changes</DialogTitle>
                    <DialogDescription>
                      Submit a request to update your profile information. An admin will review and approve your changes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={requestedChanges.first_name}
                        onChange={(e) => setRequestedChanges({ ...requestedChanges, first_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Names</Label>
                      <Input
                        value={requestedChanges.other_names}
                        onChange={(e) => setRequestedChanges({ ...requestedChanges, other_names: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={requestedChanges.phone}
                        onChange={(e) => setRequestedChanges({ ...requestedChanges, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={requestedChanges.country}
                        onChange={(e) => setRequestedChanges({ ...requestedChanges, country: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={requestedChanges.date_of_birth}
                        onChange={(e) => setRequestedChanges({ ...requestedChanges, date_of_birth: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleRequestChange} disabled={isSubmitting} className="w-full">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
