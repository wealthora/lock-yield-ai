import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Bitcoin, CircleDollarSign, Smartphone } from "lucide-react";

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
  const handleOptionClick = (optionId: string) => {
    console.log("Selected deposit option:", optionId);
    // Handle navigation or further actions here
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Choose your preferred deposit method
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
