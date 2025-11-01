import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Edit, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { KYCModal } from "@/components/KYCModal";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  country: string;
  date_of_birth: string;
  avatar: string;
  kyc_status: string;
}

export default function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestedChanges, setRequestedChanges] = useState({
    name: "",
    phone: "",
    country: "",
    date_of_birth: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Profile error:", error);
    }

    if (data) {
      const profileData = {
        name: data.name || "",
        email: data.email || user.email || "",
        phone: data.phone || "",
        country: data.country || "",
        date_of_birth: data.date_of_birth || "",
        avatar: data.avatar || "",
        kyc_status: data.kyc_status || "not_started",
      };
      setProfile(profileData);
      setRequestedChanges({
        name: profileData.name,
        phone: profileData.phone,
        country: profileData.country,
        date_of_birth: profileData.date_of_birth,
      });
    }
    setIsLoading(false);
  };

  const handleRequestChange = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profile_change_requests")
        .insert({
          user_id: user.id,
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

  const kycStatusColor: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
    not_started: "secondary",
    pending: "outline",
    approved: "default",
    rejected: "destructive",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and security</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your account details (Read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile?.avatar && (
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar} alt="Profile avatar" />
                    <AvatarFallback>{profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="p-3 bg-muted rounded-md text-foreground">
                    {profile?.name || "Not set"}
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
                      <Label>Full Name</Label>
                      <Input
                        value={requestedChanges.name}
                        onChange={(e) => setRequestedChanges({ ...requestedChanges, name: e.target.value })}
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
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                KYC Verification
              </CardTitle>
              <CardDescription>Identity verification status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={kycStatusColor[profile?.kyc_status || "not_started"]} className="capitalize">
                  {(profile?.kyc_status || "not_started").replace("_", " ")}
                </Badge>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => setKycModalOpen(true)}
                variant={profile?.kyc_status === "approved" ? "outline" : "default"}
              >
                {profile?.kyc_status === "approved" ? "View KYC" : "Complete KYC"}
              </Button>

              {profile?.kyc_status === "not_started" && (
                <p className="text-xs text-muted-foreground">
                  Complete KYC verification to unlock higher deposit limits and withdrawal capabilities.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Protect your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Two-Factor Authentication
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <KYCModal 
        isOpen={kycModalOpen} 
        onClose={() => setKycModalOpen(false)} 
        currentStatus={profile?.kyc_status || "not_started"}
        onStatusUpdate={loadProfileData}
      />
    </div>
  );
}
