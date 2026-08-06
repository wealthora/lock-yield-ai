import { useEffect, useState } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Activity, Gauge, ShieldAlert, Newspaper, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { computeInsights, type BinaryInsights } from "@/lib/binaryInsights";
import { formatPrice } from "@/lib/binaryPricing";
import { expiryLabel } from "@/lib/binaryConstants";
import type { BinaryAsset } from "@/lib/binaryTypes";

export function BinaryAIInsights({ asset }: { asset: BinaryAsset }) {
  const [insights, setInsights] = useState<BinaryInsights>(() => computeInsights(asset));

  useEffect(() => {
    setInsights(computeInsights(asset));
    const id = window.setInterval(() => setInsights(computeInsights(asset)), 3000);
    return () => window.clearInterval(id);
  }, [asset.symbol]);

  const TrendIcon =
    insights.trend === "bullish" ? TrendingUp : insights.trend === "bearish" ? TrendingDown : Minus;
  const trendColor =
    insights.trend === "bullish"
      ? "text-accent"
      : insights.trend === "bearish"
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="glass-panel rounded-xl border border-border/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Brain className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-bold leading-tight">AI Trading Assistant</h3>
          <p className="text-[10px] text-muted-foreground">
            {asset.symbol} · updated {new Date(insights.updatedAt).toLocaleTimeString("en-GB")}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto h-5 text-[10px] border-primary/40 text-primary">
          {insights.confidence}% confidence
        </Badge>
      </div>


      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Trend</p>
          <p className={cn("text-sm font-bold capitalize flex items-center gap-1", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" /> {insights.trend}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sentiment</p>
          <p className="text-xs font-semibold mt-0.5">{insights.sentiment}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" /> Momentum score
            </span>
            <span className="font-semibold">{insights.momentum}/100</span>
          </div>
          <Progress value={insights.momentum} className="h-1.5" />
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-accent font-medium">Buy {insights.buyProbability}%</span>
            <span className="text-destructive font-medium">Sell {insights.sellProbability}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex bg-muted">
            <div className="bg-accent" style={{ width: `${insights.buyProbability}%` }} />
            <div className="bg-destructive" style={{ width: `${insights.sellProbability}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">RSI (14)</span>
            <span
              className={cn(
                "font-semibold",
                insights.rsi >= 70 ? "text-destructive" : insights.rsi <= 30 ? "text-accent" : ""
              )}
            >
              {insights.rsi}{" "}
              <span className="text-[9px] text-muted-foreground">
                {insights.rsi >= 70 ? "overbought" : insights.rsi <= 30 ? "oversold" : "neutral"}
              </span>
            </span>
          </div>
          <Progress value={insights.rsi} className="h-1.5" />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 p-2.5 text-[11px]">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">MACD (12, 26, 9)</p>
          <Badge
            variant="outline"
            className={cn(
              "h-4 px-1.5 text-[9px] uppercase",
              insights.macd.bias === "bullish" ? "border-accent/40 text-accent" : "border-destructive/40 text-destructive"
            )}
          >
            {insights.macd.bias}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1.5 font-mono tabular-nums">
          <span>
            <span className="text-muted-foreground text-[9px] block">MACD</span>
            {insights.macd.value}
          </span>
          <span>
            <span className="text-muted-foreground text-[9px] block">Signal</span>
            {insights.macd.signal}
          </span>
          <span className={insights.macd.histogram >= 0 ? "text-accent" : "text-destructive"}>
            <span className="text-muted-foreground text-[9px] block">Hist</span>
            {insights.macd.histogram}
          </span>
        </div>
      </div>



      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
          <p className="flex items-center gap-1 text-muted-foreground">
            <Gauge className="h-3 w-3" /> Volatility
          </p>
          <p className="font-semibold mt-0.5">
            {insights.volatility.level} · {insights.volatility.value}%
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
          <p className="flex items-center gap-1 text-muted-foreground">
            <Timer className="h-3 w-3" /> Suggested expiry
          </p>
          <p className="font-semibold mt-0.5">{expiryLabel(insights.suggestedExpiry)}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
          <p className="text-muted-foreground">Support</p>
          <p className="font-mono font-semibold mt-0.5">{formatPrice(asset, insights.support)}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
          <p className="text-muted-foreground">Resistance</p>
          <p className="font-mono font-semibold mt-0.5">{formatPrice(asset, insights.resistance)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
        <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Newspaper className="h-3 w-3" /> Recent news impact
        </p>
        <p className="text-[11px] mt-1">{insights.news.headline}</p>
        <Badge
          variant="outline"
          className={cn(
            "mt-1.5 h-4 px-1.5 text-[9px] uppercase",
            insights.news.impact === "positive"
              ? "border-accent/40 text-accent"
              : insights.news.impact === "negative"
              ? "border-destructive/40 text-destructive"
              : "text-muted-foreground"
          )}
        >
          {insights.news.impact}
        </Badge>
      </div>

      <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-px" />
        AI insights are informational only and do not guarantee outcomes. Trade at your own risk.
      </p>
    </div>
  );
}
