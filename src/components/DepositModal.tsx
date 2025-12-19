import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bitcoin, CircleDollarSign, Smartphone, Copy, ArrowLeft, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const depositOptions = [
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    description: "Deposit using Bitcoin network",
    icon: Bitcoin,
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    description: "Deposit using USDT stablecoin",
    icon: CircleDollarSign,
  },
  {
    id: "mpesa",
    name: "M-Pesa",
    symbol: "M-Pesa",
    description: "Instant mobile money transfer",
    icon: Smartphone,
  },
];

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionClick = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleBack = () => {
    setSelectedOption(null);
    setAmount("");
    setTransactionRef("");
    setScreenshot(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleSubmitRequest = async () => {
    if (!amount || !selectedOption) return;

    if (selectedOption === "mpesa" && !transactionRef) {
      toast({
        title: "Missing Reference",
        description: "Please enter the M-Pesa transaction reference",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('deposit-screenshots')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('deposit-screenshots')
          .getPublicUrl(fileName);
        
        screenshotUrl = publicUrl;
      }

      const methodName = depositOptions.find((o) => o.id === selectedOption)?.symbol || selectedOption;
      const depositAmount = parseFloat(amount);

      const { error } = await supabase.from("deposit_requests").insert({
        user_id: user.id,
        amount: depositAmount,
        method: methodName,
        status: "pending",
        screenshot_url: screenshotUrl,
        transaction_reference: transactionRef || null,
      });

      if (error) throw error;

      // Log pending activity for user visibility
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "deposit",
        description: `Deposit request of $${depositAmount} via ${methodName}`,
        amount: depositAmount,
        method: methodName,
        status: "pending",
      });

      toast({
        title: "Deposit Request Submitted",
        description: `Your deposit of $${amount} is pending admin approval`,
      });

      onOpenChange(false);
      setSelectedOption(null);
      setAmount("");
      setTransactionRef("");
      setScreenshot(null);
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Error",
        description: "Failed to submit deposit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDepositDetails = () => {
    if (selectedOption === "btc") {
      const btcAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={btcAddress} size={200} />
            </div>
            <div className="w-full">
              <p className="text-sm text-muted-foreground mb-2">Bitcoin Address:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded text-sm break-all">
                  {btcAddress}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(btcAddress, "Bitcoin address")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="w-full space-y-2">
              <Label>Payment Screenshot (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Upload a screenshot of your payment confirmation
              </p>
            </div>
            <Button
              onClick={handleSubmitRequest}
              disabled={!amount || isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
            </Button>
          </div>
        </div>
      );
    }

    if (selectedOption === "usdt") {
      const usdtAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={usdtAddress} size={200} />
            </div>
            <div className="w-full">
              <p className="text-sm text-muted-foreground mb-2">USDT Address (ERC-20):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded text-sm break-all">
                  {usdtAddress}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(usdtAddress, "USDT address")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="w-full space-y-2">
              <Label>Payment Screenshot (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Upload a screenshot of your payment confirmation
              </p>
            </div>
            <Button
              onClick={handleSubmitRequest}
              disabled={!amount || isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
            </Button>
          </div>
        </div>
      );
    }

    if (selectedOption === "mpesa") {
      const paybill = "400200";
      const accountNumber = "CRYPTO2025";
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-4">
            <Card className="bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Paybill Number:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold">{paybill}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(paybill, "Paybill number")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl font-semibold">{accountNumber}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(accountNumber, "Account number")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to M-Pesa on your phone</li>
                <li>Select Lipa Na M-Pesa</li>
                <li>Select Pay Bill</li>
                <li>Enter Business Number: <strong>{paybill}</strong></li>
                <li>Enter Account Number: <strong>{accountNumber}</strong></li>
                <li>Enter the amount you wish to deposit</li>
                <li>Enter your M-Pesa PIN and confirm</li>
              </ol>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mpesa-ref">Transaction Reference <span className="text-destructive">*</span></Label>
              <Input
                id="mpesa-ref"
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Enter M-Pesa transaction code"
                required
              />
            </div>
            <div className="w-full space-y-2">
              <Label>Payment Screenshot (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Upload a screenshot of your payment confirmation
              </p>
            </div>
            <Button
              onClick={handleSubmitRequest}
              disabled={!amount || isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setSelectedOption(null);
        setAmount("");
        setTransactionRef("");
        setScreenshot(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            {selectedOption ? "Complete your deposit" : "Choose your preferred deposit method"}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {selectedOption ? (
            getDepositDetails()
          ) : (
            <div className="space-y-3">
              {depositOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 hover:scale-[1.02]"
                    onClick={() => handleOptionClick(option.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">
                          {option.name} ({option.symbol})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
