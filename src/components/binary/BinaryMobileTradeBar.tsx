import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Loader2, Clock, Minus, Plus, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EXPIRY_OPTIONS, expiryLabel } from "@/lib/binaryConstants";
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

/** Compact mobile trading bar: time, amount, payout, BUY / SELL. */
export function BinaryMobileTradeBar({ asset, live, settings, balance, placing, onPlace }: Props) {
  const [amount, setAmount] = useState("10");
  const [expiry, setExpiry] = useState(60);
  const [showTimes, setShowTimes] = useState(false);

  const min = Math.max(Number(asset.min_trade), Number(settings?.global_min_trade ?? 1));
  const max = Math.min(Number(asset.max_trade), Number(settings?.global_max_trade ?? 5000));
  const stake = Number(amount);

  const expiries = useMemo(() => {
    const allowed = settings?.expiry_options;
    return EXPIRY_OPTIONS.filter((e) => !allowed?.length || allowed.includes(e.seconds));
  }, [settings]);

  const payoutRate = live?.payout ?? Number(asset.payout_percent);
  const profit = Number.isFinite(stake) ? (stake * payoutRate) / 100 : 0;
  const payout = (Number.isFinite(stake) ? stake : 0) + profit;
  const marketOpen = live?.open ?? false;

  let error: string | null = null;
  if (!Number.isFinite(stake) || stake <= 0) error = "Enter a valid amount";
  else if (stake < min) error = `Minimum trade is $${min}`;
  else if (stake > max) error = `Maximum trade is $${max}`;
  else if (stake > balance) error = "Insufficient balance";
  else if (!marketOpen) error = "Market closed";
  else if (settings && !settings.trading_enabled) error = "Trading disabled";

  const disabled = Boolean(error) || placing;
  const step = (dir: 1 | -1) => {
    const base = Number.isFinite(stake) ? stake : min;
    const next = Math.min(max, Math.max(min, base + dir * Math.max(1, Math.round(base * 0.1))));
    setAmount(String(next));
  };

  return (
    <div className="glass-panel rounded-xl border border-border/60 p-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Time</span>
          <button
            onClick={() => setShowTimes((s) => !s)}
            className="w-full h-11 rounded-lg border border-border/60 bg-background/50 px-3 flex items-center justify-between"
          >
            <span className="text-base font-bold font-mono tabular-nums">{expiryLabel(expiry)}</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Amount</span>
          <div className="h-11 rounded-lg border border-border/60 bg-background/50 flex items-center">
            <button onClick={() => step(-1)} className="h-full px-2 text-muted-foreground" aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.slice(0, 12))}
              className="h-full border-0 bg-transparent text-center text-base font-bold px-0 focus-visible:ring-0"
            />
            <button onClick={() => step(1)} className="h-full px-2 text-muted-foreground" aria-label="Increase">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showTimes && (
        <div className="grid grid-cols-4 gap-1">
          {expiries.map((e) => (
            <button
              key={e.seconds}
              onClick={() => {
                setExpiry(e.seconds);
                setShowTimes(false);
              }}
              className={cn(
                "h-8 rounded-md border text-[11px] font-semibold transition-colors",
                expiry === e.seconds
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Payout <span className="font-semibold text-foreground">${payout.toFixed(2)}</span>
        </span>
        <span className="text-accent font-bold text-base">+{payoutRate}%</span>
        <span className="text-muted-foreground">
          Profit <span className="font-semibold text-accent">+${profit.toFixed(2)}</span>
        </span>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <Info className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={disabled}
          onClick={() => onPlace("call", stake, expiry)}
          className="h-14 rounded-xl bg-none bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ArrowUpRight className="h-5 w-5" /> CALL</>}
        </Button>
        <Button
          disabled={disabled}
          onClick={() => onPlace("put", stake, expiry)}
          className="h-14 rounded-xl bg-none bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ArrowDownRight className="h-5 w-5" /> PUT</>}
        </Button>
      </div>
    </div>
  );
}
