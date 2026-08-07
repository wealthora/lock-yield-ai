import { useEffect, useMemo, useRef, useState } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Maximize2, Minimize2, CandlestickChart, AreaChart as AreaIcon, LineChart as LineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHART_TIMEFRAMES } from "@/lib/binaryConstants";
import { priceSeries, formatPrice, decimalsFor } from "@/lib/binaryPricing";
import type { BinaryAsset } from "@/lib/binaryTypes";
import type { LivePrice } from "@/hooks/useBinaryPrices";

type ChartStyle = "candles" | "area" | "line";

interface Props {
  asset: BinaryAsset;
  live?: LivePrice;
}

function TradingViewChart({ tvSymbol, interval, style }: { tvSymbol: string; interval: string; style: ChartStyle }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      interval,
      theme: "dark",
      style: style === "candles" ? "1" : style === "area" ? "3" : "2",
      locale: "en",
      autosize: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      details: false,
      backgroundColor: "rgba(0,0,0,0)",
      gridColor: "rgba(255,255,255,0.06)",
      studies: ["STD;RSI", "STD;EMA"],
      support_host: "https://www.tradingview.com",
    });
    ref.current.appendChild(script);
  }, [tvSymbol, interval, style]);

  return <div ref={ref} className="tradingview-widget-container h-full w-full" />;
}

function SyntheticChart({ asset, style, stepMs }: { asset: BinaryAsset; style: ChartStyle; stepMs: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const raw = priceSeries(asset, 90, stepMs);
    return raw.map((p) => ({
      t: new Date(p.t).toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", second: "2-digit" }),
      price: Number(p.price.toFixed(decimalsFor(asset))),
    }));
    // tick drives the live refresh
  }, [asset.symbol, stepMs, tick]);

  const min = Math.min(...data.map((d) => d.price));
  const max = Math.max(...data.map((d) => d.price));
  const pad = (max - min) * 0.12 || max * 0.001;

  const axes = (
    <>
      <XAxis dataKey="t" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
      <YAxis
        domain={[min - pad, max + pad]}
        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        width={70}
        tickFormatter={(v: number) => v.toFixed(decimalsFor(asset))}
      />
      <Tooltip
        contentStyle={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          fontSize: 12,
        }}
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      {style === "line" ? (
        <LineChart data={data}>
          {axes}
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="binaryFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {axes}
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#binaryFill)"
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

export function BinaryChart({ asset, live }: Props) {
  const [timeframe, setTimeframe] = useState("1m");
  const [style, setStyle] = useState<ChartStyle>("candles");
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tf = CHART_TIMEFRAMES.find((t) => t.id === timeframe) ?? CHART_TIMEFRAMES[4];
  // The chart must show the exact feed that settles trades, so every asset is
  // rendered from the platform price engine (no external TradingView prices).
  const useTv = false;
  const effectiveStyle: ChartStyle = style === "candles" ? "area" : style;


  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const up = (live?.price ?? 0) >= (live?.prev ?? 0);

  return (
    <div
      ref={wrapRef}
      className="glass-panel rounded-xl border border-border/60 flex flex-col overflow-hidden bg-card"
    >
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold">{asset.symbol}</h2>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{asset.category}</span>
            {asset.category === "otc" && (
              <span className="text-[8px] px-1 rounded bg-primary/15 text-primary font-bold uppercase">
                otc · 24/7
              </span>
            )}
            <span
              className={cn(
                "text-[10px] flex items-center gap-1",
                live?.open ? "text-accent" : "text-muted-foreground"
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", live?.open ? "bg-accent animate-pulse" : "bg-muted-foreground")}
              />
              {live?.open ? "Market open" : "Market closed"}
            </span>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <p
              className={cn(
                "text-xl font-bold font-mono tabular-nums transition-colors",
                up ? "text-accent" : "text-destructive"
              )}
            >
              {live ? formatPrice(asset, live.price) : "—"}
            </p>
            <p
              className={cn(
                "text-xs font-semibold pb-1",
                (live?.change24h ?? 0) >= 0 ? "text-accent" : "text-destructive"
              )}
            >
              {(live?.change24h ?? 0) >= 0 ? "+" : ""}
              {(live?.change24h ?? 0).toFixed(2)}%
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono tabular-nums flex-wrap">
            <span>Bid {live ? formatPrice(asset, live.bid) : "—"}</span>
            <span>Ask {live ? formatPrice(asset, live.ask) : "—"}</span>
            <span>Spread {live ? live.spread : asset.spread}</span>
            <span>Payout {live?.payout ?? asset.payout_percent}%</span>
            <span>{live ? new Date(live.ts).toLocaleTimeString("en-GB") : "—"}</span>
          </div>
        </div>


        <div className="ml-auto flex items-center gap-1 flex-wrap">
          <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
            {CHART_TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium transition-colors",
                  timeframe === t.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
            {([
              { id: "candles" as ChartStyle, Icon: CandlestickChart },
              { id: "area" as ChartStyle, Icon: AreaIcon },
              { id: "line" as ChartStyle, Icon: LineIcon },
            ]).map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setStyle(id)}
                aria-label={`${id} chart`}
                className={cn(
                  "px-2 py-1.5 transition-colors",
                  style === id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} aria-label="Fullscreen">
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className={cn("w-full", fullscreen ? "flex-1" : "h-[340px] sm:h-[420px]")}>
        {useTv ? (
          <TradingViewChart tvSymbol={asset.tv_symbol!} interval={tf.tvInterval} style={effectiveStyle} />
        ) : (
          <SyntheticChart asset={asset} style={effectiveStyle} stepMs={tf.stepMs} />
        )}
      </div>
      {!useTv && (
        <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
          Synthetic index — priced by the Wealthora volatility engine.
        </p>
      )}
    </div>
  );
}
