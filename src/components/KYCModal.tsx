import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  rejectionReason?: string | null;
  onStatusUpdate: () => void;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const IDENTITY_FORMATS = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const RESIDENCE_FORMATS = [...IDENTITY_FORMATS, "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const KYCModal = ({ isOpen, onClose, currentStatus, rejectionReason, onStatusUpdate }: KYCModalProps) => {
  const [proofOfIdentity, setProofOfIdentity] = useState<File | null>(null);
  const [proofOfResidence, setProofOfResidence] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [residenceError, setResidenceError] = useState<string | null>(null);

  const getProgressValue = () => {
    if (currentStatus === "verified") return 100;
    if (currentStatus === "pending") return 66;
    return 33;
  };

  const getStatusColor = () => {
    if (currentStatus === "verified") return "text-green-500";
    if (currentStatus === "pending") return "text-yellow-500";
    if (currentStatus === "rejected") return "text-red-500";
    return "text-muted-foreground";
  };

  const getStatusText = () => {
    if (currentStatus === "verified") return "Verified";
    if (currentStatus === "pending") return "Pending Review";
    if (currentStatus === "rejected") return "Rejected";
    return "Not Started";
  };

  const validateIdentityFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 1MB";
    }
    if (!IDENTITY_FORMATS.includes(file.type)) {
      return "Only image files (JPG, PNG, GIF, WebP) are accepted";
    }
    return null;
  };

  const validateResidenceFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 1MB";
    }
    if (!RESIDENCE_FORMATS.includes(file.type)) {
      return "Only images, PDF, or DOCX files are accepted";
    }
    return null;
  };

  const handleIdentityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateIdentityFile(file);
      setIdentityError(error);
      if (!error) {
        setProofOfIdentity(file);
      } else {
        setProofOfIdentity(null);
        e.target.value = "";
      }
    }
  };

  const handleResidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateResidenceFile(file);
      setResidenceError(error);
      if (!error) {
        setProofOfResidence(file);
      } else {
        setProofOfResidence(null);
        e.target.value = "";
      }
    }
  };

  const uploadFile = async (file: File, documentType: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    const response = await fetch(
      `https://rjbdcucejlsegbgqmoao.supabase.co/functions/v1/upload-kyc-document`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    return result.url;
  };

  const handleSubmit = async () => {
    // Validate both documents are present
    if (!proofOfIdentity) {
      toast({
        title: "Missing Document",
        description: "Please upload your Proof of Identity (ID card or Driving License).",
        variant: "destructive",
      });
      return;
    }

    if (!proofOfResidence) {
      toast({
        title: "Missing Document",
        description: "Please upload your Proof of Residence (utility bill or official document).",
        variant: "destructive",
      });
      return;
    }

    // Re-validate files before submission
    const identityValidation = validateIdentityFile(proofOfIdentity);
    if (identityValidation) {
      setIdentityError(identityValidation);
      return;
    }

    const residenceValidation = validateResidenceFile(proofOfResidence);
    if (residenceValidation) {
      setResidenceError(residenceValidation);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload documents
      const identityUrl = await uploadFile(proofOfIdentity, "proof-of-identity");
      const residenceUrl = await uploadFile(proofOfResidence, "proof-of-residence");

      // Update profile with KYC data
      const { error } = await supabase
        .from("profiles")
        .update({
          proof_of_identity_url: identityUrl,
          proof_of_residence_url: residenceUrl,
          kyc_status: "pending",
          kyc_rejection_reason: null,
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Log activity
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "kyc_update",
        description: "KYC verification documents submitted",
      });

      toast({
        title: "KYC Submitted Successfully",
        description: "Your documents have been submitted for review. We'll notify you once verified.",
      });

      // Reset state
      setProofOfIdentity(null);
      setProofOfResidence(null);
      onStatusUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit KYC verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearIdentity = () => {
    setProofOfIdentity(null);
    setIdentityError(null);
  };

  const clearResidence = () => {
    setProofOfResidence(null);
    setResidenceError(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">KYC Verification</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Verification Status</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Not Started</span>
            <span>Pending</span>
            <span>Verified</span>
          </div>
        </div>

        {currentStatus === "verified" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h3 className="text-xl font-semibold">Account Verified</h3>
            <p className="text-center text-muted-foreground">
              Your account has been successfully verified. You can now access all features.
            </p>
          </div>
        ) : currentStatus === "pending" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="w-16 h-16 text-yellow-500" />
            <h3 className="text-xl font-semibold">Verification Pending</h3>
            <p className="text-center text-muted-foreground">
              Your documents are under review. This usually takes 24-48 hours. We'll notify you once complete.
            </p>
          </div>
        ) : currentStatus === "rejected" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h3 className="text-xl font-semibold">Verification Rejected</h3>
            {rejectionReason && (
              <Alert variant="destructive" className="max-w-md">
                <AlertDescription>
                  <strong>Reason:</strong> {rejectionReason}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-center text-muted-foreground">
              Please review the reason above and resubmit your documents.
            </p>
            <Button onClick={() => {}} className="mt-4">
              Resubmit Documents
            </Button>
          </div>
        ) : null}

        {/* Show form for not started or rejected status */}
        {(currentStatus === "not_started" || currentStatus === "rejected" || !currentStatus) && (
          <div className="space-y-6">
            {/* Proof of Identity */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Proof of Identity *</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload your Government-issued National ID card or Driving License. 
                  Must clearly display your full name and be valid.
                </p>
              </div>
              
              {proofOfIdentity ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getFileIcon(proofOfIdentity)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{proofOfIdentity.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(proofOfIdentity.size)}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearIdentity}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP (Max 1MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      onChange={handleIdentityChange}
                    />
                  </label>
                  {identityError && (
                    <p className="text-sm text-destructive">{identityError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Proof of Residence */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Proof of Residence *</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a utility bill (electricity, water, gas), internet bill, 
                  or any official document showing your residential address.
                </p>
              </div>
              
              {proofOfResidence ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getFileIcon(proofOfResidence)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{proofOfResidence.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(proofOfResidence.size)}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearResidence}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">Images, PDF, or DOCX (Max 1MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx"
                      onChange={handleResidenceChange}
                    />
                  </label>
                  {residenceError && (
                    <p className="text-sm text-destructive">{residenceError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !proofOfIdentity || !proofOfResidence}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
