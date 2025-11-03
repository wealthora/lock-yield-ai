import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActiveInvestments } from "@/components/ActiveInvestments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Award, BarChart3 } from "lucide-react";

interface Analytics {
  totalInvested: number;
  totalReturns: number;
  roi: number;
  activeInvestments: number;
  successfulTrades: number;
  daysActive: number;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalInvested: 0,
    totalReturns: 0,
    roi: 0,
    activeInvestments: 0,
    successfulTrades: 0,
    daysActive: 0,
  });

  useEffect(() => {
    loadAnalytics();

    // Set up real-time subscriptions
    const walletsChannel = supabase
      .channel("wallets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    const investmentsChannel = supabase
      .channel("investments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bot_investments",
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel("transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletsChannel);
      supabase.removeChannel(investmentsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, []);

  const loadAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get wallet data
    const { data: wallet } = await supabase
      .from("wallets")
      .select("locked_balance, returns_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get active investments
    const { data: investments } = await supabase
      .from("bot_investments")
      .select("initial_amount, accumulated_returns")
      .eq("user_id", user.id)
      .eq("status", "active");

    // Count successful trades (bot_return_credit transactions)
    const { count: successfulTrades } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "bot_return_credit")
      .eq("status", "approved");

    // Get first approved deposit date
    const { data: firstDeposit } = await supabase
      .from("transactions")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("type", "deposit")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Calculate metrics
    const totalInvested = wallet?.locked_balance || 0;
    const totalReturns = wallet?.returns_balance || 0;
    
    // Calculate average ROI
    let roi = 0;
    if (investments && investments.length > 0) {
      const totalInvestedAmount = investments.reduce((sum, inv) => sum + inv.initial_amount, 0);
      const totalAccumulatedReturns = investments.reduce((sum, inv) => sum + (inv.accumulated_returns || 0), 0);
      if (totalInvestedAmount > 0) {
        roi = (totalAccumulatedReturns / totalInvestedAmount) * 100;
      }
    }

    // Calculate days active
    let daysActive = 0;
    if (firstDeposit) {
      const firstDate = new Date(firstDeposit.created_at);
      const today = new Date();
      daysActive = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    setAnalytics({
      totalInvested,
      totalReturns,
      roi,
      activeInvestments: investments?.length || 0,
      successfulTrades: successfulTrades || 0,
      daysActive,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Education</h1>
        <p className="text-muted-foreground mt-1">Track your performance and learn trading strategies</p>
      </div>

      <ActiveInvestments />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Your trading statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Total Invested</span>
              <span className="font-semibold">${analytics.totalInvested.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Total Returns</span>
              <span className="font-semibold text-primary">+${analytics.totalReturns.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">ROI</span>
              <span className="font-semibold">{analytics.roi.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-warning" />
              Trading Achievements
            </CardTitle>
            <CardDescription>Your milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Active Investments</span>
              <span className="font-semibold">{analytics.activeInvestments}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Successful Trades</span>
              <span className="font-semibold">{analytics.successfulTrades}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Days Active</span>
              <span className="font-semibold">{analytics.daysActive}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Educational Resources
          </CardTitle>
          <CardDescription>Learn and improve your trading skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Forex Basics</h3>
              <p className="text-sm text-muted-foreground">
                Learn the fundamentals of forex trading
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-1">Technical Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Master charts and indicators
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mb-3">
                <Award className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-semibold mb-1">Risk Management</h3>
              <p className="text-sm text-muted-foreground">
                Protect your capital effectively
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
