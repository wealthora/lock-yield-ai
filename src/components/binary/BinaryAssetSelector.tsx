import { useMemo, useState } from "react";
import { Star, Search, TrendingUp, TrendingDown, Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORIES } from "@/lib/binaryConstants";
import { formatPrice, isMarketOpen } from "@/lib/binaryPricing";
import type { BinaryAsset } from "@/lib/binaryTypes";
import type { LivePrice } from "@/hooks/useBinaryPrices";

interface Props {
  assets: BinaryAsset[];
  prices: Record<string, LivePrice>;
  selected: string;
  favorites: string[];
  onSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
}

const VOL_STYLES: Record<string, string> = {
  low: "bg-primary/10 text-primary border-primary/30",
  medium: "bg-accent/10 text-accent border-accent/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  extreme: "bg-destructive/20 text-destructive border-destructive/50",
};

export function BinaryAssetSelector({
  assets,
  prices,
  selected,
  favorites,
  onSelect,
  onToggleFavorite,
}: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("forex");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (tab === "favorites" ? favorites.includes(a.symbol) : a.category === tab) &&
        (!q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    );
  }, [assets, tab, query, favorites]);

  return (
    <div className="glass-panel rounded-xl border border-border/60 flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-border/50 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets"
            className="h-9 pl-8 text-sm bg-background/50"
            maxLength={40}
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 h-8">
            {[{ id: "favorites", label: "★" }, ...ASSET_CATEGORIES].map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="text-[11px] px-1">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No assets found.</p>
          )}
          {filtered.map((asset) => {
            const live = prices[asset.symbol];
            const change = live?.change24h ?? 0;
            const up = change >= 0;
            const open = isMarketOpen(asset.market_hours) && asset.is_active && !asset.is_suspended;
            const isSelected = asset.symbol === selected;

            return (
              <button
                key={asset.symbol}
                onClick={() => onSelect(asset.symbol)}
                className={cn(
                  "w-full text-left rounded-lg px-2.5 py-2 border transition-all duration-200",
                  isSelected
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
                    : "border-transparent hover:border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={favorites.includes(asset.symbol) ? "Unstar asset" : "Star asset"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(asset.symbol);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onToggleFavorite(asset.symbol);
                      }
                    }}
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        favorites.includes(asset.symbol)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground hover:text-primary"
                      )}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{asset.symbol}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      spread {asset.spread}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono tabular-nums">
                      {live ? formatPrice(asset, live.price) : "—"}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] font-medium flex items-center justify-end gap-0.5",
                        up ? "text-accent" : "text-destructive"
                      )}
                    >
                      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {change.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge
                    variant="outline"
                    className={cn("h-4 px-1.5 text-[9px] uppercase", VOL_STYLES[asset.volatility_level])}
                  >
                    {asset.volatility_level}
                  </Badge>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                    {asset.payout_percent}%
                  </Badge>
                  <span
                    className={cn(
                      "ml-auto text-[9px] flex items-center gap-0.5",
                      open ? "text-accent" : "text-muted-foreground"
                    )}
                  >
                    {open ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Open
                      </>
                    ) : (
                      <>
                        <Lock className="h-2.5 w-2.5" /> Closed
                      </>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
