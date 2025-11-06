import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KYCProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  other_names: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  date_of_birth: string | null;
  id_number: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  kyc_status: string | null;
  kyc_submitted_at: string | null;
}

export default function AdminKYC() {
  const { isLoading } = useAdminCheck();
  const [profiles, setProfiles] = useState<KYCProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<KYCProfile | null>(null);

  useEffect(() => {
    fetchKYCProfiles();
  }, []);

  const fetchKYCProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .not("kyc_status", "is", null)
      .order("kyc_submitted_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching KYC profiles", variant: "destructive" });
    } else {
      setProfiles(data || []);
    }
  };

  const updateKYCStatus = async (profileId: string, newStatus: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: newStatus })
      .eq("id", profileId);

    if (error) {
      toast({ title: "Error updating KYC status", variant: "destructive" });
    } else {
      toast({ title: `KYC status updated to ${newStatus}` });
      fetchKYCProfiles();
      if (selectedProfile && selectedProfile.id === profileId) {
        setSelectedProfile({ ...selectedProfile, kyc_status: newStatus });
      }
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div>Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">KYC Verification</h2>
          <p className="text-muted-foreground">Review and verify user identity documents</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>KYC Submissions</CardTitle>
            <CardDescription>
              Pending verifications: {profiles.filter((p) => p.kyc_status === "pending").length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.first_name && profile.other_names ? `${profile.first_name} ${profile.other_names}` : profile.first_name || "N/A"}</TableCell>
                    <TableCell>{profile.email || "N/A"}</TableCell>
                    <TableCell>{profile.country || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          profile.kyc_status === "verified"
                            ? "default"
                            : profile.kyc_status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {profile.kyc_status || "Not Started"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile.kyc_submitted_at
                        ? new Date(profile.kyc_submitted_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>KYC Documents - {selectedProfile?.first_name} {selectedProfile?.other_names}</DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm font-medium">{selectedProfile.first_name && selectedProfile.other_names ? `${selectedProfile.first_name} ${selectedProfile.other_names}` : selectedProfile.first_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm font-medium">{selectedProfile.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm font-medium">{selectedProfile.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <p className="text-sm font-medium">{selectedProfile.country || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <p className="text-sm font-medium">
                      {selectedProfile.date_of_birth
                        ? new Date(selectedProfile.date_of_birth).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>ID Number</Label>
                    <p className="text-sm font-medium">{selectedProfile.id_number || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Uploaded Documents</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedProfile.id_front_url && (
                      <div>
                        <Label className="mb-2 block">ID Front</Label>
                        <a
                          href={selectedProfile.id_front_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={selectedProfile.id_front_url}
                            alt="ID Front"
                            className="w-full h-40 object-cover rounded border"
                          />
                        </a>
                      </div>
                    )}
                    {selectedProfile.id_back_url && (
                      <div>
                        <Label className="mb-2 block">ID Back</Label>
                        <a
                          href={selectedProfile.id_back_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={selectedProfile.id_back_url}
                            alt="ID Back"
                            className="w-full h-40 object-cover rounded border"
                          />
                        </a>
                      </div>
                    )}
                    {selectedProfile.selfie_url && (
                      <div>
                        <Label className="mb-2 block">Selfie</Label>
                        <a
                          href={selectedProfile.selfie_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={selectedProfile.selfie_url}
                            alt="Selfie"
                            className="w-full h-40 object-cover rounded border"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="mb-2 block">Update KYC Status</Label>
                  <Select
                    value={selectedProfile.kyc_status || ""}
                    onValueChange={(value) => updateKYCStatus(selectedProfile.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
