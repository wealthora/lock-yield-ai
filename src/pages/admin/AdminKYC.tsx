import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, XCircle, FileText, Image, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KYCProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  other_names: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  date_of_birth: string | null;
  proof_of_identity_url: string | null;
  proof_of_residence_url: string | null;
  kyc_status: string | null;
  kyc_submitted_at: string | null;
  kyc_rejection_reason: string | null;
}

export default function AdminKYC() {
  const { isLoading } = useAdminCheck();
  const [profiles, setProfiles] = useState<KYCProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<KYCProfile | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchKYCProfiles();
  }, []);

  const fetchKYCProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, first_name, other_names, email, phone, country, date_of_birth, proof_of_identity_url, proof_of_residence_url, kyc_status, kyc_submitted_at, kyc_rejection_reason")
      .not("kyc_status", "is", null)
      .order("kyc_submitted_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching KYC profiles", variant: "destructive" });
    } else {
      setProfiles(data || []);
    }
  };

  const approveKYC = async (profileId: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        kyc_status: "verified",
        kyc_rejection_reason: null
      })
      .eq("id", profileId);

    setIsUpdating(false);

    if (error) {
      toast({ title: "Error approving KYC", variant: "destructive" });
    } else {
      toast({ title: "KYC approved successfully", description: "User has been verified." });
      fetchKYCProfiles();
      if (selectedProfile && selectedProfile.id === profileId) {
        setSelectedProfile({ ...selectedProfile, kyc_status: "verified", kyc_rejection_reason: null });
      }
    }
  };

  const handleRejectClick = () => {
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ 
        title: "Rejection reason required", 
        description: "Please provide a reason for rejecting this KYC submission.",
        variant: "destructive" 
      });
      return;
    }

    if (!selectedProfile) return;

    setIsUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        kyc_status: "rejected",
        kyc_rejection_reason: rejectionReason.trim()
      })
      .eq("id", selectedProfile.id);

    setIsUpdating(false);

    if (error) {
      toast({ title: "Error rejecting KYC", variant: "destructive" });
    } else {
      toast({ title: "KYC rejected", description: "User has been notified of the rejection." });
      fetchKYCProfiles();
      setSelectedProfile({ ...selectedProfile, kyc_status: "rejected", kyc_rejection_reason: rejectionReason.trim() });
      setShowRejectDialog(false);
    }
  };

  const getFileType = (url: string | null): "image" | "document" | null => {
    if (!url) return null;
    const ext = url.split('.').pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image";
    return "document";
  };

  const renderDocumentPreview = (url: string | null, label: string) => {
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/30">
          <FileText className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Not uploaded</p>
        </div>
      );
    }

    const fileType = getFileType(url);

    return (
      <div className="space-y-2">
        {fileType === "image" ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={url}
              alt={label}
              className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <FileText className="w-8 h-8 text-primary mb-2" />
            <p className="text-sm text-primary font-medium">View Document</p>
            <ExternalLink className="w-4 h-4 text-muted-foreground mt-1" />
          </a>
        )}
      </div>
    );
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
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No KYC submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.first_name && profile.other_names 
                          ? `${profile.first_name} ${profile.other_names}` 
                          : profile.first_name || "N/A"}
                      </TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                KYC Review - {selectedProfile?.first_name} {selectedProfile?.other_names}
              </DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="text-sm font-medium">
                      {selectedProfile.first_name && selectedProfile.other_names 
                        ? `${selectedProfile.first_name} ${selectedProfile.other_names}` 
                        : selectedProfile.first_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">{selectedProfile.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="text-sm font-medium">{selectedProfile.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Country</Label>
                    <p className="text-sm font-medium">{selectedProfile.country || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="text-sm font-medium">
                      {selectedProfile.date_of_birth
                        ? new Date(selectedProfile.date_of_birth).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          selectedProfile.kyc_status === "verified"
                            ? "default"
                            : selectedProfile.kyc_status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {selectedProfile.kyc_status || "Not Started"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Previous Rejection Reason */}
                {selectedProfile.kyc_status === "rejected" && selectedProfile.kyc_rejection_reason && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Previous Rejection Reason:</strong> {selectedProfile.kyc_rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Documents */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Uploaded Documents</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Proof of Identity
                      </Label>
                      <p className="text-xs text-muted-foreground">ID Card or Driving License</p>
                      {renderDocumentPreview(selectedProfile.proof_of_identity_url, "Proof of Identity")}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Proof of Residence
                      </Label>
                      <p className="text-xs text-muted-foreground">Utility Bill or Official Document</p>
                      {renderDocumentPreview(selectedProfile.proof_of_residence_url, "Proof of Residence")}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedProfile.kyc_status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => approveKYC(selectedProfile.id)}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve KYC
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRejectClick}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject KYC
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rejection Reason Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYC Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a clear reason for rejecting this KYC submission..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be shown to the user so they can correct and resubmit.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmReject}
                disabled={isUpdating || !rejectionReason.trim()}
              >
                {isUpdating ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
