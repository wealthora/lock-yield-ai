import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Shield, Clock, Upload, AlertCircle } from "lucide-react";
import { KYCModal } from "@/components/KYCModal";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  country: string;
  date_of_birth: string;
  avatar: string | null;
  kyc_status: string;
}

export default function ProfileSettings() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for edit request
  const [requestData, setRequestData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    country: "",
    date_of_birth: "",
    avatar: null,
    kyc_status: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadProfileData();
    checkPendingRequests();
  }, []);

  // Real-time subscription for profile updates
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
        },
        async (payload) => {
          // Check if this is for the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user && payload.new && (payload.new as any).id === user.id) {
            loadProfileData();
            toast({
              title: "Profile Updated",
              description: "Your profile has been updated by an administrator.",
            });
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_change_requests',
        },
        () => {
          checkPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const profileData = {
        name: data.name || "",
        email: user.email || "",
        phone: data.phone || "",
        country: data.country || "",
        date_of_birth: data.date_of_birth || "",
        avatar: data.avatar || null,
        kyc_status: data.kyc_status || "not_submitted",
      };

      setProfile(profileData);
      setRequestData(profileData);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profile_change_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setPendingRequest(data);
    } catch (error) {
      setPendingRequest(null);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Avatar image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleRequestChange = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload avatar if changed
      let avatarUrl = requestData.avatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id);
      }

      const changedFields: any = {};
      if (requestData.name !== profile?.name) changedFields.name = requestData.name;
      if (requestData.phone !== profile?.phone) changedFields.phone = requestData.phone;
      if (requestData.country !== profile?.country) changedFields.country = requestData.country;
      if (requestData.date_of_birth !== profile?.date_of_birth) changedFields.date_of_birth = requestData.date_of_birth;
      if (avatarUrl !== profile?.avatar) changedFields.avatar = avatarUrl;

      if (Object.keys(changedFields).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes detected to request",
        });
        return;
      }

      const { error } = await supabase.from("profile_change_requests").insert({
        user_id: user.id,
        requested_changes: changedFields,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your profile change request has been submitted for admin review.",
      });

      setDialogOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      checkPendingRequests();
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const kycStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and security</p>
      </div>

      {pendingRequest && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You have a pending profile change request submitted on {new Date(pendingRequest.created_at).toLocaleDateString()}.
            It is currently under review by administrators.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your profile details are displayed below. Request changes through the admin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-medium">{profile?.name}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.name || "Not provided"}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Email Address</Label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.email || "Not provided"}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.phone || "Not provided"}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Country</Label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.country || "Not provided"}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Date of Birth</Label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : "Not provided"}
                  </div>
                </div>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={!!pendingRequest}>
                    <Edit className="mr-2 h-4 w-4" />
                    Request Information Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Request Profile Changes</DialogTitle>
                    <DialogDescription>
                      Submit a request to update your profile information. An admin will review and approve your changes.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Avatar Upload */}
                    <div className="space-y-2">
                      <Label>Profile Photo</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={avatarPreview || profile?.avatar || undefined} />
                          <AvatarFallback>
                            {requestData.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload New Photo
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG or WEBP (Max 5MB)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={requestData.name}
                        onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={requestData.phone}
                        onChange={(e) => setRequestData({ ...requestData, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={requestData.country}
                        onChange={(e) => setRequestData({ ...requestData, country: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={requestData.date_of_birth}
                        onChange={(e) => setRequestData({ ...requestData, date_of_birth: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRequestChange} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* KYC Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KYC Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={kycStatusColor(profile?.kyc_status || "not_submitted")}>
                  {profile?.kyc_status?.replace("_", " ").toUpperCase() || "NOT SUBMITTED"}
                </Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowKYC(true)}
                disabled={profile?.kyc_status === "verified"}
              >
                {profile?.kyc_status === "verified" ? "Verified" : "Complete Verification"}
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                Two-Factor Authentication
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <KYCModal 
        isOpen={showKYC} 
        onClose={() => setShowKYC(false)}
        currentStatus={profile?.kyc_status || "not_submitted"}
        onStatusUpdate={loadProfileData}
      />
    </div>
  );
}