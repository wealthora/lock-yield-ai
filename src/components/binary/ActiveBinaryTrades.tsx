import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCountdown, expiryLabel } from "@/lib/binaryConstants";
import { formatPrice } from "@/lib/binaryPricing";
import { useNow } from "@/hooks/useBinaryPrices";
import type { BinaryAsset, BinaryTrade } from "@/lib/binaryTypes";
import type { LivePrice } from "@/hooks/useBinaryPrices";

interface Props {
  trades: BinaryTrade[];
  assets: BinaryAsset[];
  prices: Record<string, LivePrice>;
}

export function ActiveBinaryTrades({ trades, assets, prices }: Props) {
  const now = useNow(250);

  if (trades.length === 0) {
    return (
      <div className="glass-panel rounded-xl border border-border/60 p-6 text-center">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No active trades</p>
        <p className="text-xs text-muted-foreground mt-0.5">Open positions will appear here with a live countdown.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const asset = assets.find((a) => a.symbol === trade.symbol);
        const current = prices[trade.symbol]?.price;
        const entry = Number(trade.entry_price);
        const expiresAt = new Date(trade.expires_at).getTime();
        const openedAt = new Date(trade.opened_at).getTime();
        const remaining = expiresAt - now;
        const progress = Math.min(100, Math.max(0, ((now - openedAt) / (expiresAt - openedAt)) * 100));

        const winning =
          current === undefined
            ? null
            : trade.direction === "call"
            ? current > entry
            : current < entry;
        const livePnl = winning === null ? 0 : winning ? Number(trade.potential_payout) - Number(trade.stake) : -Number(trade.stake);
        const isCall = trade.direction === "call";

        return (
          <div
            key={trade.id}
            className="glass-panel rounded-xl border border-border/60 p-3 animate-fade-in"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={cn(
                  "h-5 gap-1 text-[10px] font-bold",
                  isCall ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"
                )}
              >
                {isCall ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trade.direction.toUpperCase()}
              </Badge>
              <span className="text-sm font-semibold">{trade.symbol}</span>
              <Badge variant="outline" className="h-5 text-[10px]">
                {expiryLabel(trade.expiry_seconds)}
              </Badge>
              <span
                className={cn(
                  "ml-auto text-sm font-bold font-mono tabular-nums",
                  remaining < 10000 ? "text-destructive" : "text-primary"
                )}
              >
                {formatCountdown(remaining)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-[11px]">
              <div>
                <p className="text-muted-foreground">Entry</p>
                <p className="font-mono font-semibold">{asset ? formatPrice(asset, entry) : entry.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current</p>
                <p className="font-mono font-semibold">
                  {current !== undefined && asset ? formatPrice(asset, current) : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Stake</p>
                <p className="font-semibold">${Number(trade.stake).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Potential profit</p>
                <p className="font-semibold text-accent">
                  +${(Number(trade.potential_payout) - Number(trade.stake)).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span
                className={cn(
                  "text-xs font-bold shrink-0",
                  winning === null ? "text-muted-foreground" : winning ? "text-accent" : "text-destructive"
                )}
              >
                {winning === null ? "—" : `${livePnl >= 0 ? "+" : "-"}$${Math.abs(livePnl).toFixed(2)}`}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 text-[10px] shrink-0",
                  winning ? "border-accent/40 text-accent" : "border-destructive/40 text-destructive"
                )}
              >
                {remaining <= 0 ? "Settling" : winning ? "In the money" : "Out of the money"}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
