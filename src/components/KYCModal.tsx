import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  onStatusUpdate: () => void;
}

export const KYCModal = ({ isOpen, onClose, currentStatus, onStatusUpdate }: KYCModalProps) => {
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getProgressValue = () => {
    if (currentStatus === "verified") return 100;
    if (currentStatus === "pending") return 66;
    return 33;
  };

  const getStatusColor = () => {
    if (currentStatus === "verified") return "text-green-500";
    if (currentStatus === "pending") return "text-yellow-500";
    return "text-gray-500";
  };

  const getStatusText = () => {
    if (currentStatus === "verified") return "Verified";
    if (currentStatus === "pending") return "Pending Review";
    return "Not Started";
  };

  const uploadFile = async (file: File, path: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${path}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!fullName || !idNumber || !country || !dateOfBirth || !idFront || !idBack || !selfie) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields and upload all required documents.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload documents
      const idFrontUrl = await uploadFile(idFront, "id-front");
      const idBackUrl = await uploadFile(idBack, "id-back");
      const selfieUrl = await uploadFile(selfie, "selfie");

      // Update profile with KYC data
      const { error } = await supabase
        .from("profiles")
        .update({
          name: fullName,
          country: country,
          date_of_birth: dateOfBirth,
          id_number: idNumber,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          selfie_url: selfieUrl,
          kyc_status: "pending",
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "KYC Submitted Successfully",
        description: "Your verification documents have been submitted for review. We'll notify you once verified.",
      });

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
        ) : (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name as per ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">National ID / Passport Number</Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your ID or passport number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Enter your country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Document Uploads</h3>

              <div className="space-y-2">
                <Label htmlFor="idFront">Front of ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="idFront"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                  />
                  {idFront && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idBack">Back of ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="idBack"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                  />
                  {idBack && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selfie">Selfie with ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="selfie"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                  />
                  {selfie && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Please upload a clear photo of yourself holding your ID next to your face
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
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
