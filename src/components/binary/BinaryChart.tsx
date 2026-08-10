import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  Customized,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Maximize2, Minimize2, CandlestickChart, AreaChart as AreaIcon, LineChart as LineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHART_TIMEFRAMES } from "@/lib/binaryConstants";
import { priceSeries, candleSeries, formatPrice, decimalsFor } from "@/lib/binaryPricing";
import type { BinaryAsset, BinaryTrade } from "@/lib/binaryTypes";
import { useNow, type LivePrice } from "@/hooks/useBinaryPrices";


type ChartStyle = "candles" | "area" | "line";

interface Props {
  asset: BinaryAsset;
  live?: LivePrice;
  /** Trades on any asset — filtered to this symbol for chart annotations. */
  trades?: BinaryTrade[];
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

interface CandleRow {
  t: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Candles are drawn through recharts' <Customized>, using the real axis scales
 * so the price axis stays tight around the data for every asset type.
 */
function Candles(props: Record<string, unknown>) {
  const data = (props.data ?? []) as CandleRow[];
  const xMap = props.xAxisMap as Record<string, { scale: (v: unknown) => number; bandSize?: number }>;
  const yMap = props.yAxisMap as Record<string, { scale: (v: number) => number }>;
  const xAxis = xMap && Object.values(xMap)[0];
  const yAxis = yMap && Object.values(yMap)[0];
  if (!xAxis || !yAxis || !data.length) return null;
  const band = xAxis.bandSize ?? 8;
  const bw = Math.max(2, band * 0.6);

  return (
    <g>
      {data.map((c, i) => {
        const cx = xAxis.scale(c.t) + band / 2;
        const up = c.close >= c.open;
        const color = up ? "hsl(var(--accent))" : "hsl(var(--destructive))";
        const yHigh = yAxis.scale(c.high);
        const yLow = yAxis.scale(c.low);
        const yTop = yAxis.scale(Math.max(c.open, c.close));
        const yBottom = yAxis.scale(Math.min(c.open, c.close));
        if (!Number.isFinite(cx) || !Number.isFinite(yHigh)) return null;
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
            <rect
              x={cx - bw / 2}
              y={yTop}
              width={bw}
              height={Math.max(1, yBottom - yTop)}
              fill={color}
            />
          </g>
        );
      })}
    </g>
  );
}

interface MarkerTrade {
  id: string;
  direction: "call" | "put";
  stake: number;
  /** Immutable execution price stored on the trade — never derived from the live feed. */
  entryPrice: number;
  exitPrice: number | null;
  openedAt: number;
  expiresAt: number;
  status: string;
  result: string | null;
  potentialPayout: number;
}

/**
 * Draws the moving current-price line plus one fixed marker per trade.
 * Rendered through <Customized> so it can use the chart's real y scale.
 */
function PriceOverlay(props: Record<string, unknown>) {
  const {
    yAxisMap,
    offset,
    asset,
    live,
    trades,
    now,
  } = props as unknown as {
    yAxisMap: Record<string, { scale: (v: number) => number }>;
    offset: { left: number; top: number; width: number; height: number };
    asset: BinaryAsset;
    live?: LivePrice;
    trades: MarkerTrade[];
    now: number;
  };

  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  if (!yAxis || !offset) return null;

  const x1 = offset.left;
  const x2 = offset.left + offset.width;
  const top = offset.top;
  const bottom = offset.top + offset.height;
  const clamp = (y: number) => Math.min(bottom - 6, Math.max(top + 6, y));
  const inView = (y: number) => Number.isFinite(y) && y >= top - 40 && y <= bottom + 40;

  // Keep labels readable when entry prices sit very close together, without
  // ever moving the actual price level of a line.
  const rows = trades
    .map((t) => ({ trade: t, y: yAxis.scale(t.entryPrice) }))
    .filter((r) => inView(r.y))
    .sort((a, b) => a.y - b.y);
  let lastLabelY = -Infinity;
  const placed = rows.map((r) => {
    const labelY = clamp(Math.max(r.y, lastLabelY + 20));
    lastLabelY = labelY;
    return { ...r, labelY };
  });

  const liveY = live ? clamp(yAxis.scale(live.price)) : null;

  return (
    <g pointerEvents="none">
      <defs>
        <filter id="wo-line-glow" x="-20%" y="-400%" width="140%" height="900%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ---- trade entry markers (fixed) ---- */}
      {placed.map(({ trade, y, labelY }) => {
        const call = trade.direction === "call";
        const active = trade.status === "open";
        const stroke = call ? "hsl(var(--accent))" : "hsl(var(--destructive))";
        const remaining = Math.max(0, Math.ceil((trade.expiresAt - now) / 1000));
        const mm = Math.floor(remaining / 60);
        const ss = remaining % 60;
        const text = `${call ? "BUY" : "SELL"} · $${trade.stake.toFixed(2)} · ${formatPrice(asset, trade.entryPrice)}${
          active ? ` · ${mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${ss}s`}` : ""
        }`;
        const w = Math.max(120, text.length * 5.6 + 14);

        return (
          <g key={trade.id} opacity={active ? 1 : 0.45}>
            <line
              x1={x1}
              x2={x2}
              y1={y}
              y2={y}
              stroke={stroke}
              strokeWidth={active ? 1.25 : 1}
              strokeDasharray={active ? "6 4" : "2 5"}
            />
            <circle cx={x1 + 4} cy={y} r={2.5} fill={stroke} />
            {labelY !== y && (
              <line x1={x1 + 8} x2={x1 + 14} y1={y} y2={labelY} stroke={stroke} strokeWidth={0.75} opacity={0.6} />
            )}
            <rect
              x={x1 + 14}
              y={labelY - 8}
              width={w}
              height={16}
              rx={3}
              fill="hsl(var(--card))"
              stroke={stroke}
              strokeWidth={0.75}
            />
            <text
              x={x1 + 20}
              y={labelY + 4}
              fontSize={9.5}
              fontWeight={700}
              fill={stroke}
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              {text}
            </text>
            {!active && trade.exitPrice != null && inView(yAxis.scale(trade.exitPrice)) && (
              <g>
                <line
                  x1={x2 - 26}
                  x2={x2}
                  y1={clamp(yAxis.scale(trade.exitPrice))}
                  y2={clamp(yAxis.scale(trade.exitPrice))}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* ---- current price line (moves) ---- */}
      {liveY != null && live && (
        <g>
          <line
            x1={x1}
            x2={x2}
            y1={liveY}
            y2={liveY}
            stroke="hsl(var(--primary))"
            strokeWidth={1.25}
            strokeDasharray="4 3"
            filter="url(#wo-line-glow)"
          />
          <rect
            x={x2 - 72}
            y={liveY - 9}
            width={72}
            height={18}
            rx={3}
            fill="hsl(var(--primary))"
          />
          <text
            x={x2 - 36}
            y={liveY + 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="hsl(var(--primary-foreground))"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {formatPrice(asset, live.price)}
          </text>
        </g>
      )}
    </g>
  );
}


function SyntheticChart({
  asset,
  live,
  style,
  stepMs,
  markers,
  now,
}: {
  asset: BinaryAsset;
  live?: LivePrice;
  style: ChartStyle;
  stepMs: number;
  markers: MarkerTrade[];
  now: number;
}) {

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const decimals = decimalsFor(asset);
  const label = (t: number) =>
    new Date(t).toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", second: "2-digit" });

  const candles = useMemo(() => {
    if (style !== "candles") return [];
    const endMs = live?.ts ?? Date.now();
    const raw = candleSeries(asset, 60, stepMs, endMs);
    return raw.map((c, i) => {
      const close = i === raw.length - 1 && live ? live.price : c.close;
      const high = Math.max(c.high, close);
      const low = Math.min(c.low, close);
      return {
        t: label(c.t),
        open: Number(c.open.toFixed(decimals)),
        close: Number(close.toFixed(decimals)),
        high: Number(high.toFixed(decimals)),
        low: Number(low.toFixed(decimals)),
        // recharts needs a numeric bar value: base + span
        low_: low,
        range: high - low,
      };
    });
    // tick drives the live refresh
  }, [asset.symbol, live?.price, live?.ts, stepMs, tick, style, decimals]);

  const data = useMemo(() => {
    if (style === "candles") return [];
    const endMs = live?.ts ?? Date.now();
    const raw = priceSeries(asset, 90, stepMs, endMs);
    return raw.map((p) => ({
      t: label(p.t),
      price: Number((live && p.t === endMs ? live.price : p.price).toFixed(decimals)),
    }));
    // tick drives the live refresh
  }, [asset.symbol, live?.price, live?.ts, stepMs, tick, style, decimals]);

  const values = style === "candles" ? candles.flatMap((c) => [c.high, c.low]) : data.map((d) => d.price);
  // Keep open-trade entry levels inside the visible price range.
  const marked = markers.filter((m) => m.status === "open").map((m) => m.entryPrice);
  const all = [...values, ...marked];
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;
  const pad = (max - min) * 0.12 || max * 0.001;

  const overlay = (p: Record<string, unknown>) => (
    <PriceOverlay {...p} asset={asset} live={live} trades={markers} now={now} />
  );


  const axes = (
    <>
      <XAxis dataKey="t" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
      <YAxis
        domain={[min - pad, max + pad]}
        allowDataOverflow
        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        width={70}
        tickFormatter={(v: number) => v.toFixed(decimals)}
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

  if (style === "candles") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={candles}>
          {axes}
          <Bar dataKey="close" fill="transparent" isAnimationActive={false} />
          <Customized component={Candles} />
          <Customized component={overlay} />
        </ComposedChart>

      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {style === "line" ? (
        <LineChart data={data}>
          {axes}
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          <Customized component={overlay} />
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
          <Customized component={overlay} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}


export function BinaryChart({ asset, live, trades = [] }: Props) {

  const [timeframe, setTimeframe] = useState("1m");
  const [style, setStyle] = useState<ChartStyle>("candles");
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tf = CHART_TIMEFRAMES.find((t) => t.id === timeframe) ?? CHART_TIMEFRAMES[4];
  // The chart must show the exact feed that settles trades, so every asset is
  // rendered from the platform price engine (no external TradingView prices).
  const useTv = false;
  const effectiveStyle: ChartStyle = style;

  const now = useNow(500);

  /**
   * Markers for the selected instrument only, so chart and trade state stay in
   * sync when the user switches asset or timeframe. entry_price is read
   * straight off the trade record (immutable) — never from the live feed.
   */
  const markers: MarkerTrade[] = useMemo(() => {
    const cutoff = now - 10 * 60 * 1000;
    return trades
      .filter(
        (t) =>
          t.symbol === asset.symbol &&
          (t.status === "open" || new Date(t.settled_at ?? t.expires_at).getTime() >= cutoff)
      )
      .slice(0, 12)
      .map((t) => ({
        id: t.id,
        direction: t.direction,
        stake: Number(t.stake),
        entryPrice: Number(t.entry_price),
        exitPrice: t.exit_price == null ? null : Number(t.exit_price),
        openedAt: new Date(t.opened_at).getTime(),
        expiresAt: new Date(t.expires_at).getTime(),
        status: t.status,
        result: t.result,
        potentialPayout: Number(t.potential_payout),
      }));
  }, [trades, asset.symbol, Math.floor(now / 60000)]);



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

      <div className={cn("w-full", fullscreen ? "flex-1" : "h-[260px] sm:h-[380px] xl:h-[420px]")}>
        {useTv ? (
          <TradingViewChart tvSymbol={asset.tv_symbol!} interval={tf.tvInterval} style={effectiveStyle} />
        ) : (
          <SyntheticChart
            asset={asset}
            live={live}
            style={effectiveStyle}
            stepMs={tf.stepMs}
            markers={markers}
            now={now}
          />

        )}
      </div>
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
        Live Wealthora price feed — trades execute and settle on exactly these prices.
      </p>
    </div>

  );
}
