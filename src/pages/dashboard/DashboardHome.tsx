import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/AvatarSelector";
import { TradingViewTicker } from "@/components/dashboard/TradingViewTicker";
import { ReturnsChart } from "@/components/dashboard/ReturnsChart";
import { ActivityItem } from "@/components/ActivityItem";
import { cn } from "@/lib/utils";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  TrendingUp,
  Gift,
  Package,
  Copy,
  Users as UsersIcon,
  ChevronRight as ChevRight,
  Activity,
  Wallet as WalletIcon,
  ShieldCheck,
  DollarSign,
  Clock,
  Bell,
  BarChart3,
  History,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from "recharts";

interface Balance {
  available_balance: number;
  locked_balance: number;
  returns_balance: number;
}

const RANGE_OPTIONS = [
  { label: "24H", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
  { label: "ALL", days: 99999 },
] as const;

const ALLOCATION_COLORS = [
  "hsl(var(--primary))",
  "hsl(200 90% 55%)",
  "hsl(160 70% 45%)",
  "hsl(45 90% 55%)",
  "hsl(280 65% 60%)",
];

/** Animated number count-up */
function CountUp({ value, prefix = "", decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = display;
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [totals, setTotals] = useState({ deposit: 0, withdrawal: 0, profit: 0, bonus: 0, todayProfit: 0 });
  const [pendingCounts, setPendingCounts] = useState({ deposits: 0, withdrawals: 0 });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activePlansCount, setActivePlansCount] = useState(0);
  const [currentPlanName, setCurrentPlanName] = useState<string>("—");
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, totalEarned: 0 });
  const [allocation, setAllocation] = useState<{ name: string; value: number }[]>([]);
  const [returnSeries, setReturnSeries] = useState<{ date: string; dailyReturn: number; cumulativeReturn: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["label"]>("30D");

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("dashboard-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [
      walletRes,
      profileRes,
      txRes,
      depAllRes,
      wdAllRes,
      plansRes,
      refsRes,
      rewardsRes,
      returnsRes,
      activitiesRes,
      notifRes,
    ] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("transactions").select("type, amount, status, created_at").eq("user_id", user.id),
      supabase.from("deposit_requests").select("amount, status").eq("user_id", user.id),
      supabase.from("withdrawal_requests").select("amount, status").eq("user_id", user.id),
      supabase
        .from("bot_investments")
        .select("id, initial_amount, locked_amount, status, ai_bots(name)")
        .eq("user_id", user.id)
        .eq("status", "active"),


      supabase.from("referrals").select("id").eq("referrer_id", user.id),
      supabase.from("referral_rewards").select("reward_amount").eq("referrer_id", user.id),
      supabase
        .from("bot_returns")
        .select("date, daily_return, cumulative_return")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(400),
      supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

    setBalance(walletRes.data || { available_balance: 0, locked_balance: 0, returns_balance: 0 });
    setProfile(profileRes.data);
    setRecentActivities(activitiesRes.data || []);
    setUnreadNotifications(notifRes.count || 0);

    const plans = plansRes.data || [];
    setActivePlansCount(plans.length);
    const planName = (plans[0] as any)?.ai_bots?.name || (plans.length ? "Active Plan" : "None");
    setCurrentPlanName(planName);

    // Allocation: bots (by locked_amount) + available cash, as slices of total portfolio
    const allocMap = new Map<string, number>();
    plans.forEach((p: any) => {
      const name = p.ai_bots?.name || "Other";
      const amt = Number(p.locked_amount ?? p.initial_amount ?? 0);
      if (amt > 0) allocMap.set(name, (allocMap.get(name) || 0) + amt);
    });
    const availableCash = Number(walletRes.data?.available_balance ?? 0);
    const allocationArr = Array.from(allocMap.entries()).map(([name, value]) => ({ name, value }));
    if (availableCash > 0) allocationArr.push({ name: "Available Cash", value: availableCash });
    setAllocation(allocationArr);


    // Totals
    const txs = txRes.data || [];
    const sum = (filter: (t: any) => boolean) =>
      txs.filter(filter).reduce((s, t) => s + Number(t.amount || 0), 0);
    const sumAmt = (arr: any[] | null) =>
      (arr || []).filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.amount || 0), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayProfit = (returnsRes.data || [])
      .filter((r: any) => r.date === todayStr)
      .reduce((s: number, r: any) => s + Number(r.daily_return || 0), 0);


    setTotals({
      deposit: sumAmt(depAllRes.data),
      withdrawal: sumAmt(wdAllRes.data),
      profit: sum((t) => t.type === "bot_return_credit" && t.status === "approved"),
      bonus: sum((t) => (t.type === "referral_bonus" || t.type === "bonus") && t.status === "approved"),
      todayProfit,
    });

    setPendingCounts({
      deposits: (depAllRes.data || []).filter((r: any) => r.status === "pending").length,
      withdrawals: (wdAllRes.data || []).filter((r: any) => r.status === "pending").length,
    });

    setReferralStats({
      totalReferred: refsRes.data?.length || 0,
      totalEarned: (rewardsRes.data || []).reduce((s, r) => s + Number(r.reward_amount), 0),
    });

    // Returns series (already has cumulative from DB)
    const rows = (returnsRes.data || []).slice().reverse();
    setReturnSeries(
      rows.map((r) => ({
        date: r.date,
        dailyReturn: Number(r.daily_return || 0),
        cumulativeReturn: Number(r.cumulative_return || 0),
      }))
    );
  };

  const fullName = profile?.first_name
    ? `${profile.first_name}${profile.other_names ? " " + profile.other_names : ""}`
    : "Trader";
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const available = balance?.available_balance ?? 0;
  const portfolioValue = (balance?.available_balance ?? 0) + (balance?.locked_balance ?? 0);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";
  const referralLink = `${window.location.origin}/auth?ref=${userId || ""}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Filtered chart data by range
  const filteredSeries = useMemo(() => {
    const opt = RANGE_OPTIONS.find((r) => r.label === range)!;
    if (opt.days >= 99999) return returnSeries;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - opt.days);
    return returnSeries.filter((r) => new Date(r.date) >= cutoff);
  }, [returnSeries, range]);

  const isVerified = profile?.kyc_status === "verified" || profile?.kyc_status === "approved";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact Hero */}
      <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                Welcome back, {fullName}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{today}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/dashboard/deposit")}
                className="bg-primary/90 hover:bg-primary shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Quick Deposit
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/withdraw")}
                className="border-border/80 hover:-translate-y-0.5 transition-all"
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance + Stats grid */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr,2fr]">
        {/* Account/Available Balance */}
        <div className="rounded-xl border border-border/60 bg-card p-5 relative overflow-hidden hover:border-primary/40 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Available Balance</p>
                <p className="text-xs text-muted-foreground">Ready to withdraw or invest</p>
              </div>
            </div>
            <button
              onClick={() => setShowBalance((v) => !v)}
              className="h-8 w-8 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted/40"
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold tabular-nums">
              {showBalance ? fmt(available) : "••••••"}
            </span>
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              <ShieldCheck className="h-3 w-3 mr-1" /> Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Portfolio value:{" "}
            <span className="text-foreground font-medium">{showBalance ? fmt(portfolioValue) : "••••"}</span>
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/deposit")}
              className="border-border/60 hover:border-primary/40 hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Deposit
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/withdraw")}
              className="border-border/60 hover:border-primary/40 hover:bg-primary/5"
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary/40" />
        </div>

        {/* Distinct Stat cards */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Profit"
            value={totals.profit}
            icon={<DollarSign className="h-4 w-4" />}
            tone="emerald"
            onClick={() => navigate("/dashboard/profit-history")}
            subtitle="Lifetime realized"
          />
          <StatCard
            label="Bonus Balance"
            value={totals.bonus}
            icon={<Gift className="h-4 w-4" />}
            tone="primary"
            onClick={() => navigate("/dashboard/referrals")}
            subtitle="Promotional rewards"
          />
          <StatCard
            label="Total Deposits"
            value={totals.deposit}
            icon={<ArrowDownRight className="h-4 w-4" />}
            tone="emerald"
            onClick={() => navigate("/dashboard/deposit")}
            subtitle="All-time approved"
          />
          <StatCard
            label="Total Withdrawals"
            value={totals.withdrawal}
            icon={<ArrowUpRight className="h-4 w-4" />}
            tone="rose"
            onClick={() => navigate("/dashboard/withdraw")}
            subtitle="All-time approved"
          />
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat icon={<Package className="h-4 w-4" />} label="Active Plans" value={activePlansCount} onClick={() => navigate("/dashboard/my-plans")} />
        <QuickStat icon={<TrendingUp className="h-4 w-4" />} label="Today's Profit" value={fmt(totals.todayProfit)} onClick={() => navigate("/dashboard/profit-history")} tone="emerald" />
        <QuickStat icon={<Clock className="h-4 w-4" />} label="Pending Deposits" value={pendingCounts.deposits} onClick={() => navigate("/dashboard/transactions")} tone="amber" />
        <QuickStat icon={<Clock className="h-4 w-4" />} label="Pending Withdrawals" value={pendingCounts.withdrawals} onClick={() => navigate("/dashboard/transactions")} tone="amber" />
        <QuickStat icon={<UsersIcon className="h-4 w-4" />} label="Referral Earnings" value={fmt(referralStats.totalEarned)} onClick={() => navigate("/dashboard/referrals")} />
        <QuickStat icon={<Bell className="h-4 w-4" />} label="Unread Alerts" value={unreadNotifications} tone={unreadNotifications ? "rose" : undefined} />
      </div>

      {/* Portfolio Performance + Right column */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Portfolio Performance</CardTitle>
            </div>
            <div className="flex gap-1 rounded-md border border-border/60 p-0.5 bg-background/40">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRange(r.label)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded-sm transition-colors",
                    range === r.label
                      ? "bg-primary/20 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {filteredSeries.length ? (
              <ReturnsChart data={[...filteredSeries].reverse()} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No performance data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Invest in a plan to start tracking returns.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile card */}
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col items-center text-center pb-4 border-b border-border/60">
              <div className="relative">
                <UserAvatar src={profile?.avatar} fallback={profile?.first_name || "U"} size="xl" />
                <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <p className="mt-3 font-semibold">{fullName}</p>
              <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
              <div className="mt-2">
                {isVerified ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-rose-400 border-rose-500/40">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Current Plan" value={currentPlanName} />
              <Row label="Active Plans" value={String(activePlansCount)} />
              <Row label="Referrals" value={String(referralStats.totalReferred)} />
              <Row label="Portfolio" value={fmt(portfolioValue)} />
            </div>

            {/* Portfolio allocation donut */}
            <div className="pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-2">Portfolio Allocation</p>
              {allocation.length ? (
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocation}
                          innerRadius={28}
                          outerRadius={44}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {allocation.map((_, i) => (
                            <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v: any) => fmt(Number(v))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    {allocation.slice(0, 5).map((a, i) => {
                      const total = allocation.reduce((s, x) => s + x.value, 0) || 1;
                      const pct = (a.value / total) * 100;
                      return (
                        <div key={a.name} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                            />
                            <span className="truncate">{a.name}</span>
                          </div>
                          <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No active allocations.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Overview */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Market Overview</CardTitle>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex sm:grid gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-1 px-1 sm:mx-0 sm:px-0 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { s: "BINANCE:BTCUSDT", n: "Bitcoin", t: "BTC" },
              { s: "BINANCE:ETHUSDT", n: "Ethereum", t: "ETH" },
              { s: "BINANCE:BNBUSDT", n: "BNB", t: "BNB" },
              { s: "BINANCE:SOLUSDT", n: "Solana", t: "SOL" },
            ].map((m) => (
              <div key={m.t} className="snap-start shrink-0 w-[80%] sm:w-auto rounded-xl hover:scale-[1.01] transition-transform">
                <TradingViewTicker symbol={m.s} title={m.n} ticker={m.t} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions + Refer & Earn */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/transactions")}>
              View All <ChevRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivities.length ? (
              <div className="divide-y divide-border/60">
                {recentActivities.map((a) => (
                  <ActivityItem
                    key={a.id}
                    activityType={a.activity_type}
                    description={a.description}
                    amount={a.amount ? Number(a.amount) : undefined}
                    method={a.method}
                    status={a.status}
                    createdAt={a.created_at}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <History className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Refer & Earn</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/referrals")}>
              Details <ChevRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <UsersIcon className="h-3 w-3 mr-1" /> Earn 10% commission
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Your Referral Link</p>
              <div className="flex gap-2">
                <Input readOnly value={referralLink} className="font-mono text-xs bg-background/40" />
                <Button
                  onClick={copyReferralLink}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{referralStats.totalReferred}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Earnings</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(referralStats.totalEarned)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Platform Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Platform Activity</span>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active</Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full w-[85%] bg-gradient-to-r from-primary via-accent to-primary/60" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <PlatformStat icon={<UsersIcon className="h-3 w-3" />} chip="Users" label="Total Users" value="12,458+" />
            <PlatformStat icon={<WalletIcon className="h-3 w-3" />} chip="AUM" label="Total Investments" value="$9.5M+" chipClass="bg-emerald-500/15 text-emerald-400" />
            <PlatformStat icon={<Activity className="h-3 w-3" />} chip="Uptime" label="Server Uptime" value="99.9%" chipClass="bg-purple-500/15 text-purple-300" />
          </div>
        </CardContent>
      </Card>

      {/* Mobile Floating Quick Deposit */}
      <button
        onClick={() => navigate("/dashboard/deposit")}
        className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-95 transition-transform safe-bottom"
        aria-label="Quick Deposit"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  subtitle,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "primary" | "emerald" | "rose" | "amber";
  subtitle?: string;
  onClick?: () => void;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-400",
    rose: "bg-rose-500/15 text-rose-400",
    amber: "bg-amber-500/15 text-amber-400",
  };
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center", toneMap[tone])}>{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-2 tabular-nums">
        <CountUp value={value} prefix="$" />
      </p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </button>
  );
}

function QuickStat({
  icon,
  label,
  value,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  onClick?: () => void;
  tone?: "emerald" | "rose" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
      ? "text-amber-400"
      : "text-primary";
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-border/60 bg-card p-3 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-7 w-7 rounded-md bg-muted/40 flex items-center justify-center", toneClass)}>{icon}</span>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold mt-1.5 tabular-nums">{value}</p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function PlatformStat({
  icon,
  chip,
  label,
  value,
  chipClass = "bg-primary/15 text-primary",
}: {
  icon: React.ReactNode;
  chip: string;
  label: string;
  value: string;
  chipClass?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${chipClass}`}>
          {icon} {chip}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
