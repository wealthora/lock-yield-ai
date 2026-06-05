import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, CircleDollarSign, CheckCircle2, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "./PaymentMethodsTable";

interface Props {
  method: PaymentMethod | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onChangeMethod?: () => void;
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

export function DepositFlowDialog({ method, onOpenChange, onSuccess, onChangeMethod }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("");
  const [txRef, setTxRef] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (method) {
      setStep(1);
      setAmount("");
      setTxRef("");
      setProof(null);
    }
  }, [method?.id]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const handleProceed = () => {
    if (!method) return;
    const value = parseFloat(amount);
    if (!value || value < method.min_deposit) {
      toast({
        title: "Invalid amount",
        description: `Minimum deposit is $${method.min_deposit}`,
        variant: "destructive",
      });
      return;
    }
    if (method.max_deposit && value > method.max_deposit) {
      toast({
        title: "Amount too high",
        description: `Maximum deposit is $${method.max_deposit}`,
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleFile = (f: File | null) => {
    if (!f) return setProof(null);
    if (!ACCEPTED.includes(f.type)) {
      toast({ title: "Invalid file", description: "Use JPG, PNG, or PDF", variant: "destructive" });
      return;
    }
    if (f.size > MAX_PROOF_BYTES) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setProof(f);
  };

  const handleSubmit = async () => {
    if (!method) return;
    if (!proof) {
      toast({
        title: "Payment proof required",
        description: "Please upload a screenshot or PDF of your payment",
        variant: "destructive",
      });
      return;
    }
    const value = parseFloat(amount);
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = proof.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("deposit-proofs")
        .upload(path, proof, { contentType: proof.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("deposit-proofs").getPublicUrl(path);

      const { data: dep, error } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          amount: value,
          method: method.name,
          status: "pending",
          transaction_reference: txRef || null,
          screenshot_url: pub.publicUrl,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "deposit",
        description: `Deposit request of $${value} via ${method.name}`,
        amount: value,
        method: method.name,
        status: "pending",
        metadata: { request_id: dep.id },
      });

      toast({
        title: "Deposit submitted",
        description: `Your $${value} deposit is pending approval`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!method} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {method && step === 1 && (
          <div>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-base">
                <CircleDollarSign className="h-5 w-5 text-primary" />
                Deposit Details
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount" className="text-xs text-muted-foreground">
                    Amount to deposit
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Min: <span className="text-foreground font-medium">${method.min_deposit}</span>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-12 text-base bg-muted/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-background flex items-center justify-center text-lg">
                    {method.icon || "💳"}
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Selected Method</p>
                    <p className="text-sm font-semibold">{method.name}</p>
                  </div>
                </div>
                {onChangeMethod && (
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      onChangeMethod();
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              <Button
                onClick={handleProceed}
                className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:opacity-95 text-white"
              >
                <CircleDollarSign className="h-4 w-4 mr-2" />
                Complete Deposit
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                By proceeding, you agree to our terms of service
              </p>
            </div>
          </div>
        )}

        {method && step === 2 && (
          <div>
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
              <DialogTitle className="text-base">Complete your payment process</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg">
                  {method.icon || "💳"}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Your payment method</p>
                  <p className="text-sm font-semibold">{method.name}</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 border border-border p-3 text-center text-sm">
                You are to make payment of <span className="font-semibold">${amount}</span> using your selected payment method.
              </div>

              {method.deposit_address ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-lg">
                      <QRCodeSVG value={method.deposit_address} size={140} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1.5">{method.name} Address:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted p-2.5 rounded text-xs break-all">
                        {method.deposit_address}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(method.deposit_address!, "Address")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {method.network && (
                      <p className="text-xs mt-2">
                        <span className="font-medium">Network Type:</span>{" "}
                        <span className="text-primary">{method.network}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
                  Deposit address not configured. Please contact support.
                </div>
              )}

              {method.deposit_instructions && (
                <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground whitespace-pre-line">
                  {method.deposit_instructions}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-sm font-semibold">
                  Upload Payment proof after payment <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  Accepted formats: JPG, PNG, PDF (Max. 5MB)
                </p>
                {proof && (
                  <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {proof.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ref" className="text-xs">
                  Transaction Reference (Optional)
                </Label>
                <Input
                  id="ref"
                  placeholder="Transaction hash / reference"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !proof}
                  className={cn(
                    "flex-[2] h-11 font-semibold text-white",
                    "bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:opacity-95"
                  )}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Submit Payment
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
