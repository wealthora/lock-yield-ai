import { Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/binaryPricing";
import { isOtc } from "@/lib/binaryQuotes";
import { Sparkline } from "./Sparkline";
import { useSparkline } from "@/hooks/useBinaryPrices";
import type { BinaryAsset } from "@/lib/binaryTypes";
import type { Quote } from "@/lib/binaryQuotes";

interface Props {
  assets: BinaryAsset[];
  prices: Record<string, Quote>;
  selected: string;
  favorites: string[];
  onSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
}

function TickerCard({
  asset,
  quote,
  active,
  starred,
  onSelect,
  onToggleFavorite,
}: {
  asset: BinaryAsset;
  quote?: Quote;
  active: boolean;
  starred: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const change = quote?.change24h ?? 0;
  const up = change >= 0;
  const otc = isOtc(asset);

  const spark = useSparkline(asset, 20, 5000, 2000);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "shrink-0 w-[188px] text-left rounded-lg border p-2.5 transition-all duration-200",
        active
          ? "border-primary/60 bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
          : "border-border/60 bg-card/60 hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold",
            otc ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {asset.symbol.replace(/[^A-Z0-9]/g, "").slice(0, 2)}
        </span>
        <span className="text-[11px] font-semibold truncate">{asset.symbol}</span>
        {otc && (
          <span className="text-[8px] px-1 rounded bg-primary/15 text-primary font-bold uppercase">otc</span>
        )}
        <span
          className={cn("ml-auto text-[10px] font-semibold shrink-0", up ? "text-accent" : "text-destructive")}
        >
          {up ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>

      <div className="flex items-end gap-2 mt-1">
        <div className="min-w-0">
          <p className="text-xs font-mono tabular-nums font-semibold truncate">
            {quote ? formatPrice(asset, quote.price) : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono tabular-nums truncate">
            {quote ? `${formatPrice(asset, quote.bid)} / ${formatPrice(asset, quote.ask)}` : "—"}
          </p>
        </div>
        <Sparkline values={spark} up={up} className="ml-auto shrink-0" />
      </div>

      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[9px] text-primary font-semibold">{asset.payout_percent}%</span>
        <span
          className={cn(
            "text-[9px] flex items-center gap-0.5",
            quote?.open ? "text-accent" : "text-muted-foreground"
          )}
        >
          {quote?.open ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Live
            </>
          ) : (
            <>
              <Lock className="h-2.5 w-2.5" /> Closed
            </>
          )}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label={starred ? "Unstar asset" : "Star asset"}
          className="ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleFavorite();
            }
          }}
        >
          <Star
            className={cn(
              "h-3 w-3 transition-colors",
              starred ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
            )}
          />
        </span>
      </div>
    </button>
  );
}

/** Horizontally scrolling live quote cards along the top of the terminal. */
export function BinaryTickerStrip({
  assets,
  prices,
  selected,
  favorites,
  onSelect,
  onToggleFavorite,
}: Props) {
  if (assets.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      {assets.map((asset) => (
        <TickerCard
          key={asset.symbol}
          asset={asset}
          quote={prices[asset.symbol]}
          active={asset.symbol === selected}
          starred={favorites.includes(asset.symbol)}
          onSelect={() => onSelect(asset.symbol)}
          onToggleFavorite={() => onToggleFavorite(asset.symbol)}
        />
      ))}
    </div>
  );
}
