import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TwoFactorDialog } from "@/components/TwoFactorDialog";
import type { PaymentMethod } from "./PaymentMethodsTable";

interface Props {
  method: PaymentMethod | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WithdrawFlowDialog({ method, onOpenChange, onSuccess }: Props) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [pending, setPending] = useState<any>(null);

  const handleSubmit = async () => {
    if (!method) return;
    const value = parseFloat(amount);
    if (!address || !value) {
      toast({ title: "Missing fields", description: "Fill all fields", variant: "destructive" });
      return;
    }
    if (value < method.min_withdrawal) {
      toast({
        title: "Below minimum",
        description: `Minimum withdrawal is $${method.min_withdrawal}`,
        variant: "destructive",
      });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!wallet || Number(wallet.available_balance) < value) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setPending({ userId: user.id, amount: value, walletAddress: address, methodName: method.name });
    setShow2FA(true);
  };

  const handleVerified = async () => {
    if (!pending) return;
    try {
      const { data: w, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: pending.userId,
          amount: pending.amount,
          method: pending.methodName,
          wallet_address: pending.walletAddress,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: pending.userId,
        activity_type: "withdrawal",
        description: `Withdrawal request of $${pending.amount} via ${pending.methodName}`,
        amount: pending.amount,
        method: pending.methodName,
        status: "pending",
        metadata: { request_id: w.id },
      });
      toast({ title: "Withdrawal submitted", description: "Pending admin approval" });
      setAmount("");
      setAddress("");
      setPending(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={!!method && !show2FA} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw {method?.name}</DialogTitle>
          </DialogHeader>
          {method && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Destination Wallet Address</Label>
                <Input
                  id="address"
                  placeholder="Enter your wallet address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amt">Amount (USD)</Label>
                <Input
                  id="amt"
                  type="number"
                  placeholder={`Min $${method.min_withdrawal}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fee: {method.fee_percent}% · Processing: {method.processing_time}
              </p>
              <Button className="w-full" onClick={handleSubmit}>
                Continue
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <TwoFactorDialog
        open={show2FA}
        onOpenChange={(o) => {
          setShow2FA(o);
          if (!o) setPending(null);
        }}
        purpose="withdrawal"
        onVerified={handleVerified}
      />
    </>
  );
}
