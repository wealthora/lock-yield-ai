import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Investment {
  id: string;
  bot_id: string;
  initial_amount: number;
  locked_amount: number;
  accumulated_returns: number;
  daily_return_rate: number;
  start_date: string;
  end_date: string;
  status: string;
  ai_bots: {
    name: string;
    strategy: string;
    risk_level: string;
  };
}

export function ActiveInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);

  useEffect(() => {
    loadInvestments();

    // Realtime subscription
    const channel = supabase
      .channel('investments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_investments',
        },
        () => {
          loadInvestments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInvestments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("bot_investments")
      .select(`
        *,
        ai_bots (
          name,
          strategy,
          risk_level
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    setInvestments(data || []);
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (investments.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Active Bot Investments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {investments.map((investment) => {
          const daysRemaining = calculateDaysRemaining(investment.end_date);
          const progress = calculateProgress(investment.start_date, investment.end_date);
          
          return (
            <Card key={investment.id} className="border-primary/10">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{investment.ai_bots.name}</h4>
                    <p className="text-sm text-muted-foreground">{investment.ai_bots.strategy}</p>
                  </div>
                  <Badge variant="secondary">{investment.ai_bots.risk_level} Risk</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Invested</span>
                    </div>
                    <p className="font-semibold">${investment.initial_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Returns</span>
                    </div>
                    <p className="font-semibold text-primary">
                      +${investment.accumulated_returns.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      <span>Days Left</span>
                    </div>
                    <p className="font-semibold">{daysRemaining}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{investment.daily_return_rate}% daily</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="pt-2 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="font-semibold">
                      ${(investment.locked_amount + investment.accumulated_returns).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
