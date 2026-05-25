import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Loader2, FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  rejectionReason?: string | null;
  onStatusUpdate: () => void;
}

type SlotKey = "idFront" | "idBack" | "residence";

const SUPABASE_URL = "https://rjbdcucejlsegbgqmoao.supabase.co";
const MAX_BYTES = 1_048_576; // 1MB

const IDENTITY_FORMATS = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const RESIDENCE_FORMATS = [
  ...IDENTITY_FORMATS,
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const KYCModal = ({ isOpen, onClose, currentStatus, rejectionReason, onStatusUpdate }: KYCModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    idFront: null,
    idBack: null,
    residence: null,
  });
  const inputRefs = {
    idFront: useRef<HTMLInputElement>(null),
    idBack: useRef<HTMLInputElement>(null),
    residence: useRef<HTMLInputElement>(null),
  };

  const getProgressValue = () => {
    if (currentStatus === "verified") return 100;
    if (currentStatus === "pending") return 66;
    return 33;
  };

  const getStatusColor = () => {
    if (currentStatus === "verified") return "text-green-500";
    if (currentStatus === "pending") return "text-yellow-500";
    if (currentStatus === "rejected" || currentStatus === "revoked") return "text-red-500";
    return "text-muted-foreground";
  };

  const getStatusText = () => {
    if (currentStatus === "verified") return "Verified";
    if (currentStatus === "pending") return "Pending Review";
    if (currentStatus === "rejected") return "Rejected";
    if (currentStatus === "revoked") return "Revoked – Resubmission Required";
    return "Not Started";
  };

  const validateFile = (file: File, slot: SlotKey): string | null => {
    if (file.size > MAX_BYTES) return "File must be less than 1MB.";
    const allowed = slot === "residence" ? RESIDENCE_FORMATS : IDENTITY_FORMATS;
    if (!allowed.includes(file.type)) {
      return slot === "residence"
        ? "Allowed formats: JPG, PNG, GIF, WEBP, PDF, DOCX."
        : "Allowed formats: JPG, PNG, GIF, WEBP.";
    }
    return null;
  };

  const onFileChange = (slot: SlotKey, file: File | null) => {
    if (!file) {
      setFiles((p) => ({ ...p, [slot]: null }));
      return;
    }
    const err = validateFile(file, slot);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      if (inputRefs[slot].current) inputRefs[slot].current!.value = "";
      return;
    }
    setFiles((p) => ({ ...p, [slot]: file }));
  };

  const uploadOne = async (file: File, documentType: string, token: string): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-kyc-document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await res.json();
    if (!res.ok || !json?.path) {
      throw new Error(json?.error || `Failed to upload ${documentType}`);
    }
    return json.path as string;
  };

  const handleSubmit = async () => {
    if (!files.idFront || !files.idBack || !files.residence) {
      toast({
        title: "Missing documents",
        description: "Please upload ID front, ID back, and proof of residence.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const [idFrontPath, idBackPath, residencePath] = await Promise.all([
        uploadOne(files.idFront, "proof-of-identity", session.access_token),
        uploadOne(files.idBack, "proof-of-identity", session.access_token),
        uploadOne(files.residence, "proof-of-residence", session.access_token),
      ]);

      const { error } = await supabase
        .from("profiles")
        .update({
          kyc_status: "pending",
          kyc_rejection_reason: null,
          kyc_submitted_at: new Date().toISOString(),
          id_front_url: idFrontPath,
          id_back_url: idBackPath,
          proof_of_residence_url: residencePath,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      await supabase.from("activities").insert({
        user_id: session.user.id,
        activity_type: "kyc_update",
        description: "KYC verification documents uploaded for review",
      });

      toast({
        title: "Documents Submitted",
        description: "Your documents are under review. Verification typically takes 24–48 hours.",
      });

      setFiles({ idFront: null, idBack: null, residence: null });
      setShowResubmit(false);
      onStatusUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUploadSlot = (slot: SlotKey, label: string, icon: React.ReactNode, hint: string) => {
    const file = files[slot];
    const accept = slot === "residence"
      ? "image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "image/jpeg,image/png,image/gif,image/webp";

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="font-medium">{label}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <input
          ref={inputRefs[slot]}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFileChange(slot, e.target.files?.[0] || null)}
        />
        {file ? (
          <div className="flex items-center justify-between gap-2 bg-muted/40 rounded-md p-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 shrink-0 text-primary" />
              <span className="text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onFileChange(slot, null)}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRefs[slot].current?.click()}
            disabled={isSubmitting}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose file
          </Button>
        )}
      </div>
    );
  };

  const renderUploader = () => (
    <div className="space-y-5">
      <div className="space-y-3">
        {renderUploadSlot(
          "idFront",
          "ID / Driving License – Front",
          <ImageIcon className="w-4 h-4 text-primary" />,
          "Clear photo (JPG, PNG, GIF, WEBP). Max 1MB."
        )}
        {renderUploadSlot(
          "idBack",
          "ID / Driving License – Back",
          <ImageIcon className="w-4 h-4 text-primary" />,
          "Clear photo (JPG, PNG, GIF, WEBP). Max 1MB."
        )}
        {renderUploadSlot(
          "residence",
          "Proof of Residence",
          <FileText className="w-4 h-4 text-primary" />,
          "Utility bill, internet bill, or bank statement (PDF, DOCX, or image). Max 1MB."
        )}
      </div>

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

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Submit for Review
          </>
        )}
      </Button>
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
            <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</span>
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
              Your documents have been submitted for review. Verification typically takes 24–48 hours. We'll notify you once complete.
            </p>
          </div>
        ) : (currentStatus === "rejected" || currentStatus === "revoked") && !showResubmit ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h3 className="text-xl font-semibold">
              {currentStatus === "revoked" ? "Verification Revoked" : "Verification Rejected"}
            </h3>
            {rejectionReason && (
              <Alert variant="destructive" className="max-w-md">
                <AlertDescription>
                  <strong>Reason:</strong> {rejectionReason}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-center text-muted-foreground">
              {currentStatus === "revoked"
                ? "Your previous verification has been revoked. Please resubmit your documents to regain verified status."
                : "Please review the reason above and resubmit your documents."}
            </p>
            <Button onClick={() => setShowResubmit(true)} className="mt-4">
              Resubmit Documents
            </Button>
          </div>
        ) : null}

        {(currentStatus === "not_started" || showResubmit || !currentStatus) && renderUploader()}
      </DialogContent>
    </Dialog>
  );
};
