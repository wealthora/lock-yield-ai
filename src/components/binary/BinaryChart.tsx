import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, CandlestickChart, AreaChart as AreaIcon, LineChart as LineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHART_TIMEFRAMES } from "@/lib/binaryConstants";
import { TICK_MS, priceAt, formatPrice } from "@/lib/binaryPricing";
import type { BinaryAsset, BinaryTrade } from "@/lib/binaryTypes";
import { useNow, type LivePrice } from "@/hooks/useBinaryPrices";
import {
  LightweightChartView,
  type CandleRow,
  type ChartStyle,
  type MarkerTrade,
} from "./LightweightChartView";

interface Props {
  asset: BinaryAsset;
  live?: LivePrice;
  /** Trades on any asset — filtered to this symbol for chart annotations. */
  trades?: BinaryTrade[];
}

interface CandleState {
  key: string;
  history: CandleRow[];
  active: CandleRow;
}

const HISTORY_CANDLE_COUNT = 120;

function intervalStart(timestamp: number, stepMs: number) {
  return Math.floor(timestamp / stepMs) * stepMs;
}

/** Build a closed candle once from its fixed interval. It is never recomputed after insertion. */
function buildClosedCandle(asset: BinaryAsset, start: number, stepMs: number): CandleRow {
  const samples = Math.max(2, Math.min(120, Math.ceil(stepMs / TICK_MS)));
  const sampleStep = stepMs / samples;
  const open = priceAt(asset, start);
  let high = open;
  let low = open;
  let close = open;

  for (let index = 1; index <= samples; index += 1) {
    const price = priceAt(asset, Math.min(start + index * sampleStep, start + stepMs - 1));
    high = Math.max(high, price);
    low = Math.min(low, price);
    close = price;
  }

  return { t: start, open, high, low, close, finalized: true };
}

function createInitialCandleState(asset: BinaryAsset, stepMs: number, quote?: LivePrice): CandleState {
  const timestamp = quote?.ts ?? Date.now();
  const activeStart = intervalStart(timestamp, stepMs);
  const history: CandleRow[] = [];

  for (let index = HISTORY_CANDLE_COUNT; index > 0; index -= 1) {
    history.push(buildClosedCandle(asset, activeStart - index * stepMs, stepMs));
  }

  const previousClose = history[history.length - 1]?.close ?? priceAt(asset, activeStart);
  const livePrice = quote?.price ?? previousClose;
  return {
    key: `${asset.symbol}:${stepMs}`,
    history,
    active: {
      t: activeStart,
      open: previousClose,
      high: Math.max(previousClose, livePrice),
      low: Math.min(previousClose, livePrice),
      close: livePrice,
      finalized: false,
    },
  };
}

/**
 * Maintains three separate concerns: immutable closed candles, one active
 * candle, and the independent live quote. Historical objects are only added
 * and trimmed; an incoming quote can update only the active object.
 */
function useImmutableCandles(asset: BinaryAsset, stepMs: number, live?: LivePrice) {
  const stateKey = `${asset.symbol}:${stepMs}`;
  const [state, setState] = useState<CandleState>(() => createInitialCandleState(asset, stepMs, live));

  useEffect(() => {
    setState(createInitialCandleState(asset, stepMs, live));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);

  useEffect(() => {
    if (!live) return;
    const nextStart = intervalStart(live.ts, stepMs);

    setState((current) => {
      if (current.key !== stateKey) return createInitialCandleState(asset, stepMs, live);

      if (nextStart === current.active.t) {
        const price = live.price;
        return {
          ...current,
          active: {
            ...current.active,
            high: Math.max(current.active.high, price),
            low: Math.min(current.active.low, price),
            close: price,
          },
        };
      }

      if (nextStart < current.active.t) return current;

      // Finalize a new object and never reference it as the active candle again.
      const finalized: CandleRow = { ...current.active, finalized: true };
      const additions: CandleRow[] = [finalized];
      let previousClose = finalized.close;

      // Fill intervals missed while the tab was suspended. Each object is
      // constructed once for its own closed interval and then locked in history.
      for (let start = current.active.t + stepMs; start < nextStart; start += stepMs) {
        const closed = buildClosedCandle(asset, start, stepMs);
        additions.push(closed);
        previousClose = closed.close;
      }

      const price = live.price;
      const history = [...current.history, ...additions].slice(-HISTORY_CANDLE_COUNT);
      return {
        key: stateKey,
        history,
        active: {
          t: nextStart,
          open: previousClose,
          high: Math.max(previousClose, price),
          low: Math.min(previousClose, price),
          close: price,
          finalized: false,
        },
      };
    });
  }, [asset, live?.price, live?.ts, stateKey, stepMs]);

  return state.key === stateKey ? [...state.history, state.active] : [];
}



export function BinaryChart({ asset, live, trades = [] }: Props) {

  const [timeframe, setTimeframe] = useState("1m");
  const [style, setStyle] = useState<ChartStyle>("candles");
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tf = CHART_TIMEFRAMES.find((t) => t.id === timeframe) ?? CHART_TIMEFRAMES[4];

  const now = useNow(500);
  const candles = useImmutableCandles(asset, tf.stepMs, live);


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
        <LightweightChartView
          asset={asset}
          live={live}
          style={style}
          stepMs={tf.stepMs}
          candles={candles}
          markers={markers}
          now={now}
        />
      </div>
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
        TradingView charts · Wealthora price feed — trades execute and settle on exactly these prices.
      </p>

    </div>

  );
}
