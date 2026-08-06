import { useMemo, useState } from "react";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { expiryLabel } from "@/lib/binaryConstants";
import { formatPrice } from "@/lib/binaryPricing";
import type { BinaryAsset, BinaryTrade } from "@/lib/binaryTypes";


const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export function rangeStart(range: string): { from: number; to: number } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  switch (range) {
    case "today":
      return { from: startOfDay, to: Infinity };
    case "yesterday":
      return { from: startOfDay - 86400000, to: startOfDay };
    case "week": {
      const day = now.getDay();
      const monday = startOfDay - ((day + 6) % 7) * 86400000;
      return { from: monday, to: Infinity };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: Infinity };
    default:
      return { from: 0, to: Infinity };
  }
}

export function BinaryTradeHistory({ trades, assets = [] }: { trades: BinaryTrade[]; assets?: BinaryAsset[] }) {
  const [range, setRange] = useState("today");
  const fmt = (symbol: string, value: number) => {
    const asset = assets.find((a) => a.symbol === symbol);
    return asset ? formatPrice(asset, value) : value.toFixed(4);
  };


  const filtered = useMemo(() => {
    const { from, to } = rangeStart(range);
    return trades
      .filter((t) => t.status === "settled")
      .filter((t) => {
        const ts = new Date(t.settled_at ?? t.opened_at).getTime();
        return ts >= from && ts < to;
      });
  }, [trades, range]);

  return (
    <div className="glass-panel rounded-xl border border-border/60 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <History className="h-4 w-4 text-primary" /> Trade History
        </h3>
        <div className="ml-auto flex items-center rounded-md border border-border/60 overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium transition-colors",
                range === r.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">No settled trades in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase">Trade ID</TableHead>
                <TableHead className="text-[10px] uppercase">Asset</TableHead>
                <TableHead className="text-[10px] uppercase">Dir</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Entry</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Exit</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Stake</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Payout</TableHead>
                <TableHead className="text-[10px] uppercase text-right">P/L</TableHead>
                <TableHead className="text-[10px] uppercase">Result</TableHead>
                <TableHead className="text-[10px] uppercase">Expiry</TableHead>
                <TableHead className="text-[10px] uppercase">Date</TableHead>
                <TableHead className="text-[10px] uppercase">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const settled = new Date(t.settled_at ?? t.opened_at);
                const pnl = Number(t.profit_loss ?? 0);
                const win = t.result === "win";
                return (
                  <TableRow key={t.id} className="text-xs">
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {t.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{t.symbol}</TableCell>
                    <TableCell>
                      {t.direction === "call" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(t.symbol, Number(t.entry_price))}</TableCell>
                    <TableCell className="text-right font-mono">
                      {t.exit_price !== null ? fmt(t.symbol, Number(t.exit_price)) : "—"}
                    </TableCell>

                    <TableCell className="text-right">${Number(t.stake).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      ${win ? Number(t.potential_payout).toFixed(2) : t.result === "tie" ? Number(t.stake).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell
                      className={cn("text-right font-semibold", pnl >= 0 ? "text-accent" : "text-destructive")}
                    >
                      {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-[10px] uppercase",
                          win
                            ? "border-accent/40 text-accent"
                            : t.result === "tie"
                            ? "text-muted-foreground"
                            : "border-destructive/40 text-destructive"
                        )}
                      >
                        {t.result ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px]">{expiryLabel(t.expiry_seconds)}</TableCell>
                    <TableCell className="text-[10px] whitespace-nowrap">
                      {settled.toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-[10px] whitespace-nowrap">
                      {settled.toLocaleTimeString("en-GB")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
