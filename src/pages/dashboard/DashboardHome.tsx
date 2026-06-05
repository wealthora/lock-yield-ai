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
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Gift,
  ChevronLeft,
  ChevronRight,
  Package,
  Copy,
  Users as UsersIcon,
  ChevronRight as ChevRight,
  Activity,
  Wallet as WalletIcon,
  ShieldCheck,
} from "lucide-react";

interface Balance {
  available_balance: number;
  locked_balance: number;
  returns_balance: number;
}

interface CryptoTick {
  symbol: string;
  name: string;
  price: number;
  change: number; // percent
  delta: number; // absolute price change
  color: string; // hsl token-friendly
  up: boolean;
  spark: number[];
  icon: string;
  iconBg: string;
}

const MOCK_TICKERS: CryptoTick[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 63977.0,
    change: -4.38,
    delta: -2932.43,
    color: "rose",
    up: false,
    spark: [40, 44, 42, 48, 46, 52, 50, 47, 45, 49, 46, 44],
    icon: "₿",
    iconBg: "bg-orange-500/20 text-orange-400",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 1794.06,
    change: -3.78,
    delta: -70.55,
    color: "rose",
    up: false,
    spark: [30, 35, 33, 38, 34, 40, 37, 35, 33, 36, 34, 32],
    icon: "Ξ",
    iconBg: "bg-indigo-500/20 text-indigo-300",
  },
  {
    symbol: "USDT",
    name: "Tether",
    price: 1.0,
    change: 0.03,
    delta: 0.0,
    color: "emerald",
    up: true,
    spark: [40, 41, 40, 42, 41, 42, 41, 42, 41, 42, 41, 42],
    icon: "₮",
    iconBg: "bg-emerald-500/20 text-emerald-300",
  },
  {
    symbol: "BNB",
    name: "BNB",
    price: 611.87,
    change: -4.36,
    delta: -27.89,
    color: "rose",
    up: false,
    spark: [40, 44, 42, 48, 46, 50, 48, 45, 43, 46, 44, 42],
    icon: "◆",
    iconBg: "bg-yellow-500/20 text-yellow-300",
  },
];

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 220;
  const h = 40;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(" ");
  const stroke = up ? "hsl(142 76% 45%)" : "hsl(0 75% 60%)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [totals, setTotals] = useState({ deposit: 0, withdrawal: 0, profit: 0, bonus: 0 });
  const [activePlansCount, setActivePlansCount] = useState(0);
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, totalEarned: 0 });
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("dashboard-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, loadAll)
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

    const [walletRes, profileRes, txRes, depRes, wdRes, plansRes, refsRes, rewardsRes] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("transactions").select("type, amount, status").eq("user_id", user.id),
      supabase.from("deposit_requests").select("amount, status").eq("user_id", user.id).eq("status", "approved"),
      supabase.from("withdrawal_requests").select("amount, status").eq("user_id", user.id).eq("status", "approved"),
      supabase.from("bot_investments").select("id").eq("user_id", user.id).eq("status", "active"),
      supabase.from("referrals").select("id").eq("referrer_id", user.id),
      supabase.from("referral_rewards").select("reward_amount").eq("referrer_id", user.id),
    ]);

    setBalance(walletRes.data || { available_balance: 0, locked_balance: 0, returns_balance: 0 });
    setProfile(profileRes.data);
    setActivePlansCount(plansRes.data?.length || 0);

    const txs = txRes.data || [];
    const sum = (filter: (t: any) => boolean) =>
      txs.filter(filter).reduce((s, t) => s + Number(t.amount || 0), 0);
    const sumAmt = (arr: any[] | null) => (arr || []).reduce((s, r) => s + Number(r.amount || 0), 0);

    setTotals({
      deposit: sumAmt(depRes.data),
      withdrawal: sumAmt(wdRes.data),
      profit: sum((t) => t.type === "bot_return_credit" && t.status === "approved"),
      bonus: sum((t) => (t.type === "referral_bonus" || t.type === "bonus") && t.status === "approved"),
    });

    setReferralStats({
      totalReferred: refsRes.data?.length || 0,
      totalEarned: (rewardsRes.data || []).reduce((s, r) => s + Number(r.reward_amount), 0),
    });
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
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";
  const accountBalance = (balance?.available_balance ?? 0) + (balance?.locked_balance ?? 0);
  const referralLink = `${window.location.origin}/auth?ref=${userId || ""}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const visibleTickers = MOCK_TICKERS;

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome back, {fullName}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{today}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/dashboard/deposit")}
                className="bg-primary/90 hover:bg-primary shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Quick Deposit
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/withdraw")}
                className="border-border/80"
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
              </Button>
            </div>
          </div>

          {/* Balance + stat grid */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr,2fr]">
            {/* Account balance card */}
            <div className="rounded-xl border border-border/60 bg-background/40 p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Balance</p>
                    <p className="text-xs text-muted-foreground">Your current available balance</p>
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
                <span className="text-3xl md:text-4xl font-bold">
                  {showBalance ? fmt(available) : "••••••"}
                </span>
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Available
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/deposit")}
                  className="border-border/60"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Deposit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/withdraw")}
                  className="border-border/60"
                >
                  <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary/40" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <StatCard
                label="Total Profit"
                value={fmt(totals.profit)}
                badge={
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                    <TrendingUp className="h-3 w-3" /> +2.5%
                  </span>
                }
              />
              <StatCard
                label="Bonus"
                value={fmt(totals.bonus)}
                badge={
                  <span className="inline-flex items-center gap-1 text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                    <Gift className="h-3 w-3" /> Rewards
                  </span>
                }
              />
              <StatCard
                label="Total Deposit"
                value={fmt(totals.deposit)}
                badge={
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400">
                    <ArrowDownRight className="h-3 w-3" />
                  </span>
                }
              />
              <StatCard
                label="Total Withdrawal"
                value={fmt(totals.withdrawal)}
                badge={
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-500/15 text-rose-400">
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Middle row: market + profile */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Market Overview - Live via TradingView */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <TradingViewTicker symbol="BINANCE:BTCUSDT" title="Bitcoin" ticker="BTC" />
              <TradingViewTicker symbol="BINANCE:ETHUSDT" title="Ethereum" ticker="ETH" />
              <TradingViewTicker symbol="BINANCE:BNBUSDT" title="BNB" ticker="BNB" />
              <TradingViewTicker symbol="BINANCE:SOLUSDT" title="Solana" ticker="SOL" />
            </div>
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
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Account Balance" value={fmt(accountBalance)} />
              <Row label="Bonus" value={fmt(totals.bonus)} />
              <Row label="Referral Bonus" value={fmt(referralStats.totalEarned)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard/deposit")} className="border-border/60">
                <Plus className="h-4 w-4 mr-1.5" /> Deposit
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard/withdraw")} className="border-border/60">
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-sm text-muted-foreground">Account Status</span>
              {profile?.kyc_status === "approved" ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Verified</Badge>
              ) : (
                <Badge variant="outline" className="text-rose-400 border-rose-500/40">Unverified</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Plans + Refer & Earn */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <CardTitle className="text-base font-semibold">Active Plans</CardTitle>
            <Badge variant="secondary" className="bg-muted/60">{activePlansCount}</Badge>
          </CardHeader>
          <CardContent>
            {activePlansCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No Active Plans</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  You don't have any active investment plans at the moment. Start growing your wealth today!
                </p>
                <Button
                  onClick={() => navigate("/dashboard/trading-plans")}
                  className="mt-4 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Buy a Plan
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => navigate("/dashboard/my-plans")}>
                  View My Plans <ChevRight className="h-4 w-4 ml-1" />
                </Button>
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
                <UsersIcon className="h-3 w-3 mr-1" /> Earn commissions
              </Badge>
              <span className="text-xs text-muted-foreground">Share your link below</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Your Referral Link</p>
              <div className="flex gap-2">
                <Input readOnly value={referralLink} className="font-mono text-xs bg-background/40" />
                <Button
                  onClick={copyReferralLink}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold mt-1">{referralStats.totalReferred}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Earnings</p>
                <p className="text-2xl font-bold mt-1">{fmt(referralStats.totalEarned)}</p>
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
    </div>
  );
}

function StatCard({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {badge}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
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
