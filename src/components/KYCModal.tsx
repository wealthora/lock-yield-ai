import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Loader2, Mail, Copy, FileText, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  rejectionReason?: string | null;
  onStatusUpdate: () => void;
}

const KYC_EMAIL = "wealthora.uk@gmail.com";

export const KYCModal = ({ isOpen, onClose, currentStatus, rejectionReason, onStatusUpdate }: KYCModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);

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

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(KYC_EMAIL);
      toast({
        title: "Email Copied",
        description: "Email address copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy the email manually.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmSent = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile with pending KYC status
      const { error } = await supabase
        .from("profiles")
        .update({
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
        description: "KYC verification documents sent via email",
      });

      toast({
        title: "Submission Confirmed",
        description: "Your documents have been sent for review. Verification typically takes 24–48 hours.",
      });

      onStatusUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to confirm submission. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = () => {
    setShowResubmit(true);
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      {/* Email Instructions Card */}
      <div className="bg-muted/50 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold">Submit Documents via Email</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Please email your KYC documents to:
        </p>
        
        <div className="flex items-center gap-2 bg-background p-3 rounded-md border">
          <span className="font-mono text-sm flex-1">{KYC_EMAIL}</span>
          <Button variant="ghost" size="icon" onClick={copyEmail}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Use the subject line: <strong>"Wealthora KYC – [Your Full Name]"</strong>
        </p>
      </div>

      {/* Required Documents */}
      <div className="space-y-4">
        <h4 className="font-semibold">Required Documents</h4>
        
        {/* Proof of Identity */}
        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            <span className="font-medium">1. Proof of Identity</span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            Government-issued ID card or driving license (photo format: JPG, PNG, or JPEG)
          </p>
        </div>

        {/* Proof of Address */}
        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-medium">2. Proof of Address</span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            Utility bill, internet bill, or bank statement (PDF, DOCX, or image format)
          </p>
        </div>
      </div>

      {/* Document Requirements */}
      <Alert>
        <AlertDescription className="text-sm space-y-1">
          <p className="font-medium">Document Requirements:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Must clearly show your full name</li>
            <li>Must match your country of residence</li>
            <li>Must be readable and not blurred</li>
            <li>Maximum file size: 1MB per document</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Confirmation Button */}
      <Button
        onClick={handleConfirmSent}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Confirming...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            I've Sent My Documents
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        Click the button above after you have sent your documents via email.
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              Your documents have been sent for review. Verification typically takes 24–48 hours. We'll notify you once complete.
            </p>
          </div>
        ) : currentStatus === "rejected" && !showResubmit ? (
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
            <Button onClick={handleResubmit} className="mt-4">
              Resubmit Documents
            </Button>
          </div>
        ) : null}

        {/* Show instructions for not started, rejected (resubmit), or no status */}
        {(currentStatus === "not_started" || showResubmit || !currentStatus) && renderInstructions()}
      </DialogContent>
    </Dialog>
  );
};
