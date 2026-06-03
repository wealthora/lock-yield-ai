import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PaymentMethod } from "./PaymentMethodsTable";

interface Props {
  method: PaymentMethod | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DepositFlowDialog({ method, onOpenChange, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [txRef, setTxRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const handleSubmit = async () => {
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
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: dep, error } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          amount: value,
          method: method.name,
          status: "pending",
          transaction_reference: txRef || null,
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
      setAmount("");
      setTxRef("");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit {method?.name}</DialogTitle>
        </DialogHeader>
        {method && (
          <div className="space-y-4">
            {method.deposit_address ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG value={method.deposit_address} size={160} />
                </div>
                <div className="w-full">
                  <Label className="text-xs">Deposit Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
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

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder={`Min $${method.min_deposit}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref">Transaction Reference (Optional)</Label>
              <Input
                id="ref"
                placeholder="Transaction hash / reference"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Deposit Request
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
