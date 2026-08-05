import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Trophy, Target, TrendingUp, TrendingDown, Percent, Flame, Snowflake, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { rangeStart } from "./BinaryTradeHistory";
import type { BinaryTrade } from "@/lib/binaryTypes";

const money = (v: number) =>
  `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BinaryPerformance({ trades }: { trades: BinaryTrade[] }) {
  const stats = useMemo(() => {
    const settled = trades
      .filter((t) => t.status === "settled")
      .sort((a, b) => new Date(a.settled_at ?? a.opened_at).getTime() - new Date(b.settled_at ?? b.opened_at).getTime());

    const wins = settled.filter((t) => t.result === "win");
    const losses = settled.filter((t) => t.result === "loss");
    const grossProfit = wins.reduce((s, t) => s + Number(t.profit_loss ?? 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.profit_loss ?? 0), 0));
    const staked = settled.reduce((s, t) => s + Number(t.stake), 0);
    const net = settled.reduce((s, t) => s + Number(t.profit_loss ?? 0), 0);

    const inRange = (id: string) => {
      const { from, to } = rangeStart(id);
      return settled
        .filter((t) => {
          const ts = new Date(t.settled_at ?? t.opened_at).getTime();
          return ts >= from && ts < to;
        })
        .reduce((s, t) => s + Number(t.profit_loss ?? 0), 0);
    };

    let winStreak = 0;
    let lossStreak = 0;
    for (let i = settled.length - 1; i >= 0; i--) {
      if (settled[i].result === "win" && lossStreak === 0) winStreak++;
      else if (settled[i].result === "loss" && winStreak === 0) lossStreak++;
      else break;
    }

    const best = settled.reduce((m, t) => Math.max(m, Number(t.profit_loss ?? 0)), 0);
    const worst = settled.reduce((m, t) => Math.min(m, Number(t.profit_loss ?? 0)), 0);

    let cumulative = 0;
    const equity = settled.map((t, i) => {
      cumulative += Number(t.profit_loss ?? 0);
      return { i: i + 1, pnl: Number(cumulative.toFixed(2)) };
    });

    const byDay = new Map<string, number>();
    for (const t of settled) {
      const key = new Date(t.settled_at ?? t.opened_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      byDay.set(key, (byDay.get(key) ?? 0) + Number(t.profit_loss ?? 0));
    }
    const daily = Array.from(byDay.entries())
      .slice(-14)
      .map(([day, pnl]) => ({ day, pnl: Number(pnl.toFixed(2)) }));

    return {
      total: settled.length,
      winRate: settled.length ? (wins.length / settled.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      avgReturn: settled.length ? net / settled.length : 0,
      roi: staked > 0 ? (net / staked) * 100 : 0,
      daily: inRange("today"),
      weekly: inRange("week"),
      monthly: inRange("month"),
      best,
      worst,
      winStreak,
      lossStreak,
      equity,
      dailyChart: daily,
    };
  }, [trades]);

  const cards = [
    { label: "Total Trades", value: String(stats.total), Icon: Activity, tone: "text-primary" },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, Icon: Target, tone: "text-primary" },
    {
      label: "Profit Factor",
      value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
      Icon: Percent,
      tone: "text-primary",
    },
    {
      label: "Avg Return",
      value: money(stats.avgReturn),
      Icon: TrendingUp,
      tone: stats.avgReturn >= 0 ? "text-accent" : "text-destructive",
    },
    { label: "ROI", value: `${stats.roi.toFixed(1)}%`, Icon: Percent, tone: stats.roi >= 0 ? "text-accent" : "text-destructive" },
    { label: "Daily Profit", value: money(stats.daily), Icon: TrendingUp, tone: stats.daily >= 0 ? "text-accent" : "text-destructive" },
    { label: "Weekly Profit", value: money(stats.weekly), Icon: TrendingUp, tone: stats.weekly >= 0 ? "text-accent" : "text-destructive" },
    { label: "Monthly Profit", value: money(stats.monthly), Icon: TrendingUp, tone: stats.monthly >= 0 ? "text-accent" : "text-destructive" },
    { label: "Best Trade", value: money(stats.best), Icon: Trophy, tone: "text-accent" },
    { label: "Worst Trade", value: money(stats.worst), Icon: TrendingDown, tone: "text-destructive" },
    { label: "Win Streak", value: String(stats.winStreak), Icon: Flame, tone: "text-accent" },
    { label: "Loss Streak", value: String(stats.lossStreak), Icon: Snowflake, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {cards.map(({ label, value, Icon, tone }) => (
          <div
            key={label}
            className="glass-panel rounded-xl border border-border/60 p-3 transition-all hover:border-primary/40"
          >
            <div className="flex items-center gap-1.5">
              <Icon className={cn("h-3.5 w-3.5", tone)} />
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
            </div>
            <p className={cn("text-base font-bold mt-1 tabular-nums", tone)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="glass-panel rounded-xl border border-border/60 p-3">
          <h4 className="text-xs font-bold mb-2">Cumulative P/L</h4>
          <div className="h-[200px]">
            {stats.equity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-16">No settled trades yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.equity}>
                  <XAxis dataKey="i" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={55} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-xl border border-border/60 p-3">
          <h4 className="text-xs font-bold mb-2">Daily P/L</h4>
          <div className="h-[200px]">
            {stats.dailyChart.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-16">No settled trades yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyChart}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={55} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="pnl" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
