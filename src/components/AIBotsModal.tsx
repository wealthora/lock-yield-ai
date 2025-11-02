import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Zap, Target, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIBotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvestmentCreated?: () => void;
}

interface Bot {
  id: string;
  name: string;
  description: string | null;
  daily_return_rate: number;
  minimum_investment: number;
  risk_level: string | null;
  strategy: string | null;
}

export function AIBotsModal({ open, onOpenChange, onInvestmentCreated }: AIBotsModalProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadBots();
    }
  }, [open]);

  const loadBots = async () => {
    const { data, error } = await supabase
      .from("ai_bots")
      .select("*")
      .eq("is_active", true)
      .order("minimum_investment", { ascending: true });

    if (error) {
      console.error("Error loading bots:", error);
    } else {
      setBots(data || []);
    }
  };

  const handleInvest = async () => {
    if (!selectedBot) return;

    const investAmount = parseFloat(amount);
    if (isNaN(investAmount) || investAmount < selectedBot.minimum_investment) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: `Minimum investment is $${selectedBot.minimum_investment}`,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("available_balance, locked_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet || wallet.available_balance < investAmount) {
        toast({
          variant: "destructive",
          title: "Insufficient funds",
          description: "You don't have enough available balance for this investment.",
        });
        setIsLoading(false);
        return;
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(duration));

      // Create investment
      const { data: investment, error: investError } = await supabase
        .from("bot_investments")
        .insert({
          user_id: user.id,
          bot_id: selectedBot.id,
          initial_amount: investAmount,
          locked_amount: investAmount,
          daily_return_rate: selectedBot.daily_return_rate,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (investError) throw investError;

      // Update balance - move to locked
      const { error: balanceError } = await supabase
        .from("wallets")
        .update({
          available_balance: wallet.available_balance - investAmount,
          locked_balance: (wallet.locked_balance || 0) + investAmount,
        })
        .eq("user_id", user.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "bot_allocation",
        amount: investAmount,
        status: "approved",
        bot_id: selectedBot.id,
        allocation_id: investment.id,
      });

      // Create activity log
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "bot_allocation",
        description: `Allocated $${investAmount} to ${selectedBot.name}`,
        amount: investAmount,
      });

      toast({
        title: "Investment successful!",
        description: `You've allocated $${investAmount} to ${selectedBot.name}`,
      });

      setSelectedBot(null);
      setAmount("");
      onOpenChange(false);
      onInvestmentCreated?.();
    } catch (error: any) {
      console.error("Error creating investment:", error);
      toast({
        variant: "destructive",
        title: "Investment failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBotIcon = (riskLevel: string | null) => {
    switch (riskLevel?.toLowerCase()) {
      case "low": return TrendingUp;
      case "medium": return Target;
      case "high": return Zap;
      default: return Activity;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Trading Bots</DialogTitle>
          <DialogDescription>
            {selectedBot ? "Configure your investment" : "Select an AI bot to automatically manage your forex trading"}
          </DialogDescription>
        </DialogHeader>

        {!selectedBot ? (
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {bots.map((bot) => {
              const Icon = getBotIcon(bot.risk_level);
              return (
                <Card 
                  key={bot.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedBot(bot)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{bot.name}</CardTitle>
                          <CardDescription className="text-xs">{bot.strategy}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{bot.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Return</p>
                        <p className="text-sm font-semibold text-primary">{bot.daily_return_rate}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Min. Investment</p>
                        <p className="text-sm font-semibold">${bot.minimum_investment}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Risk</p>
                        <p className="text-sm font-semibold">{bot.risk_level}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{selectedBot.name}</CardTitle>
                <CardDescription>{selectedBot.strategy}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Daily Return</p>
                    <p className="font-semibold text-primary">{selectedBot.daily_return_rate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min. Investment</p>
                    <p className="font-semibold">${selectedBot.minimum_investment}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk Level</p>
                    <p className="font-semibold">{selectedBot.risk_level}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Investment Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`Min. $${selectedBot.minimum_investment}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={selectedBot.minimum_investment}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Lock Period (Days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedBot(null)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleInvest}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Invest Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
