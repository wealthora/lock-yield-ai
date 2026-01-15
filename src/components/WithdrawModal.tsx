import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bitcoin, CircleDollarSign, Smartphone, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorDialog } from "./TwoFactorDialog";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const withdrawOptions = [
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    description: "Withdraw to Bitcoin wallet",
    icon: Bitcoin,
    comingSoon: false,
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    description: "Withdraw to USDT wallet",
    icon: CircleDollarSign,
    comingSoon: false,
  },
  {
    id: "mpesa",
    name: "M-Pesa",
    symbol: "M-Pesa",
    description: "Transfer to mobile money",
    icon: Smartphone,
    comingSoon: true,
  },
];

export function WithdrawModal({ open, onOpenChange }: WithdrawModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<{
    userId: string;
    amount: number;
    methodName: string;
    walletAddress: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    amount: "",
    mpesaNumber: "",
    mpesaName: "",
  });
  const { toast } = useToast();

  const handleOptionClick = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleBack = () => {
    setSelectedOption(null);
    setFormData({ address: "", amount: "", mpesaNumber: "", mpesaName: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (selectedOption === "mpesa") {
      if (!formData.mpesaNumber || !formData.mpesaName || !formData.amount) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.address || !formData.amount) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check available balance first
      const { data: wallet } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const requestedAmount = parseFloat(formData.amount);
      
      if (!wallet || wallet.available_balance < requestedAmount) {
        toast({
          title: "Insufficient funds",
          description: "You don't have enough available balance for this withdrawal",
          variant: "destructive",
        });
        return;
      }

      const methodName = selectedOption === "mpesa" ? "M-Pesa" : selectedOption?.toUpperCase();
      const walletAddress = selectedOption === "mpesa" 
        ? `${formData.mpesaNumber} (${formData.mpesaName})`
        : formData.address;

      // Store pending withdrawal data and show 2FA dialog
      setPendingWithdrawal({
        userId: user.id,
        amount: requestedAmount,
        methodName: methodName || "",
        walletAddress,
      });
      setShow2FADialog(true);
    } catch (error) {
      console.error("Error validating withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to validate withdrawal request",
        variant: "destructive",
      });
    }
  };

  const handleVerified = async () => {
    if (!pendingWithdrawal) return;

    try {
      // Create withdrawal request record after 2FA verification
      const { data: withdrawalData, error: withdrawalError } = await supabase.from("withdrawal_requests").insert({
        user_id: pendingWithdrawal.userId,
        amount: pendingWithdrawal.amount,
        method: pendingWithdrawal.methodName,
        wallet_address: pendingWithdrawal.walletAddress,
        status: "pending",
      }).select('id').single();

      if (withdrawalError) throw withdrawalError;

      // Log pending activity for user visibility with request_id in metadata
      await supabase.from("activities").insert({
        user_id: pendingWithdrawal.userId,
        activity_type: "withdrawal",
        description: `Withdrawal request of $${pendingWithdrawal.amount} via ${pendingWithdrawal.methodName}`,
        amount: pendingWithdrawal.amount,
        method: pendingWithdrawal.methodName,
        status: "pending",
        metadata: { request_id: withdrawalData.id },
      });

      setPendingWithdrawal(null);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setSelectedOption(null);
    setShowConfirmation(false);
    setShow2FADialog(false);
    setPendingWithdrawal(null);
    setFormData({ address: "", amount: "", mpesaNumber: "", mpesaName: "" });
    onOpenChange(false);
  };

  const selectedOptionData = withdrawOptions.find(opt => opt.id === selectedOption);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {showConfirmation ? (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-6"
            >
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <DialogTitle className="text-2xl mb-2">Request Received</DialogTitle>
              <DialogDescription className="mb-6">
                Your withdrawal request has been received and is being processed.
              </DialogDescription>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </motion.div>
          ) : !selectedOption ? (
            <motion.div
              key="options"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
                <DialogDescription>
                  Choose your preferred withdrawal method
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {withdrawOptions.map((option) => {
                  const Icon = option.icon;
                  const isDisabled = option.comingSoon;
                  return (
                    <Card
                      key={option.id}
                      className={
                        isDisabled
                          ? "opacity-60 cursor-not-allowed border-dashed"
                          : "cursor-pointer transition-all hover:shadow-md hover:border-primary/50 hover:scale-[1.02]"
                      }
                      onClick={() => !isDisabled && handleOptionClick(option.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${isDisabled ? "bg-muted" : "bg-primary/10"}`}>
                          <Icon className={`h-6 w-6 ${isDisabled ? "text-muted-foreground" : "text-primary"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-base ${isDisabled ? "text-muted-foreground" : ""}`}>
                              {option.name} ({option.symbol})
                            </h3>
                            {isDisabled && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isDisabled ? "This payment method will be available soon" : option.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>
                      Withdraw {selectedOptionData?.name}
                    </DialogTitle>
                    <DialogDescription>
                      Enter withdrawal details
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {selectedOption === "mpesa" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mpesaNumber">M-Pesa Number</Label>
                      <Input
                        id="mpesaNumber"
                        type="tel"
                        placeholder="+254 XXX XXX XXX"
                        value={formData.mpesaNumber}
                        onChange={(e) => setFormData({ ...formData, mpesaNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mpesaName">Account Name</Label>
                      <Input
                        id="mpesaName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.mpesaName}
                        onChange={(e) => setFormData({ ...formData, mpesaName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (USD)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">Wallet Address</Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Enter your wallet address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ({selectedOptionData?.symbol})</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.00000001"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full">
                  Submit Withdrawal Request
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      {/* 2FA Verification Dialog for Withdrawal */}
      <TwoFactorDialog
        open={show2FADialog}
        onOpenChange={(open) => {
          setShow2FADialog(open);
          if (!open) {
            setPendingWithdrawal(null);
          }
        }}
        purpose="withdrawal"
        onVerified={handleVerified}
      />
    </Dialog>
  );
}
