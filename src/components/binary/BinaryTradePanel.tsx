import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Loader2, Info, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EXPIRY_OPTIONS, QUICK_AMOUNTS, expiryLabel } from "@/lib/binaryConstants";
import { formatPrice } from "@/lib/binaryPricing";
import { isOtc } from "@/lib/binaryQuotes";
import type { BinaryAsset, BinarySettings } from "@/lib/binaryTypes";
import type { Quote } from "@/lib/binaryQuotes";

interface Props {
  asset: BinaryAsset;
  live?: Quote;
  settings: BinarySettings | null;
  balance: number;
  placing: boolean;
  onPlace: (direction: "call" | "put", stake: number, expirySeconds: number) => void;
}

export function BinaryTradePanel({ asset, live, settings, balance, placing, onPlace }: Props) {
  const [amount, setAmount] = useState("10");
  const [expiry, setExpiry] = useState(60);

  const min = Math.max(Number(asset.min_trade), Number(settings?.global_min_trade ?? 1));
  const max = Math.min(Number(asset.max_trade), Number(settings?.global_max_trade ?? 5000));
  const stake = Number(amount);

  const expiries = useMemo(() => {
    const allowed = settings?.expiry_options;
    return EXPIRY_OPTIONS.filter((e) => !allowed?.length || allowed.includes(e.seconds));
  }, [settings]);

  const marketOpen = live?.open ?? false;
  const payoutRate = live?.payout ?? Number(asset.payout_percent);
  const payout = Number.isFinite(stake) ? stake * (1 + payoutRate / 100) : 0;
  const profit = payout - (Number.isFinite(stake) ? stake : 0);
  const entry = live ? (/* entry fills at the ask for CALL, bid for PUT — mid is shown */ live.price) : undefined;

  let error: string | null = null;
  if (!Number.isFinite(stake) || stake <= 0) error = "Enter a valid amount";
  else if (stake < min) error = `Minimum trade is $${min}`;
  else if (stake > max) error = `Maximum trade is $${max}`;
  else if (stake > balance) error = "Insufficient available balance";
  else if (!marketOpen) error = "Market is currently closed";
  else if (settings && !settings.trading_enabled) error = "Trading is temporarily disabled";

  const disabled = Boolean(error) || placing;

  return (
    <div className="glass-panel rounded-xl border border-border/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            Place Trade
            {isOtc(asset) && (
              <span className="text-[8px] px-1 rounded bg-primary/15 text-primary font-bold uppercase">otc</span>
            )}
          </h3>
          <p className="text-[10px] text-muted-foreground truncate">{asset.symbol}</p>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          Balance ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="binary-amount" className="text-xs text-muted-foreground">
            Investment amount
          </Label>
          <span className="text-[10px] text-muted-foreground">
            ${min} – ${max}
          </span>
        </div>
        <Input
          id="binary-amount"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value.slice(0, 12))}
          className="h-10 text-base font-semibold bg-background/50"
        />
        <div className="grid grid-cols-6 gap-1">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              className={cn(
                "h-7 rounded-md border text-[11px] font-medium transition-all",
                Number(amount) === a
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              ${a}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Expiry time</Label>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-1 border-primary/40 text-primary">
            <Timer className="h-2.5 w-2.5" /> {expiryLabel(expiry)}
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {expiries.map((e) => (
            <button
              key={e.seconds}
              onClick={() => setExpiry(e.seconds)}
              className={cn(
                "h-7 rounded-md border text-[11px] font-medium transition-all",
                expiry === e.seconds
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Current price</span>
          <span
            className={cn(
              "font-mono tabular-nums font-semibold",
              (live?.price ?? 0) >= (live?.prev ?? 0) ? "text-accent" : "text-destructive"
            )}
          >
            {live ? formatPrice(asset, live.price) : "—"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Entry price</span>
          <span className="font-mono tabular-nums">{entry !== undefined ? formatPrice(asset, entry) : "—"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Bid / Ask</span>
          <span className="font-mono tabular-nums text-[11px]">
            {live ? `${formatPrice(asset, live.bid)} / ${formatPrice(asset, live.ask)}` : "—"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Spread</span>
          <span className="font-mono tabular-nums text-[11px]">{live ? live.spread : asset.spread}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Payout rate</span>
          <span className="font-semibold text-primary">{payoutRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Expected payout</span>
          <span className="font-semibold text-accent">${payout.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Potential profit</span>
          <span className="font-semibold text-accent">+${profit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Potential loss</span>
          <span className="font-semibold text-destructive">
            -${Number.isFinite(stake) ? stake.toFixed(2) : "0.00"}
          </span>
        </div>
        <div className="flex justify-between text-[10px] pt-1 border-t border-border/50">
          <span className="text-muted-foreground">Market</span>
          <span className={marketOpen ? "text-accent" : "text-muted-foreground"}>
            {marketOpen ? (isOtc(asset) ? "Open · 24/7" : "Open") : "Closed"} ·{" "}
            {live ? new Date(live.ts).toLocaleTimeString("en-GB") : "—"}
          </span>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-destructive">
          <Info className="h-3.5 w-3.5 shrink-0 mt-px" /> {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={disabled}
          onClick={() => onPlace("call", stake, expiry)}
          className="h-14 flex-col gap-0 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
        >
          {placing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="flex items-center gap-1 text-sm font-bold">
                CALL <TrendingUp className="h-4 w-4" />
              </span>
              <span className="text-[10px] opacity-80">Price will rise</span>
            </>
          )}
        </Button>
        <Button
          disabled={disabled}
          onClick={() => onPlace("put", stake, expiry)}
          className="h-14 flex-col gap-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
        >
          {placing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="flex items-center gap-1 text-sm font-bold">
                PUT <TrendingDown className="h-4 w-4" />
              </span>
              <span className="text-[10px] opacity-80">Price will fall</span>
            </>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Trade settles automatically at expiry ({expiryLabel(expiry)}) using the platform price feed.
      </p>
    </div>
  );
}
