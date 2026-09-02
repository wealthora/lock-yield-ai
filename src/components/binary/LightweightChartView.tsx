import { useEffect, useMemo, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { decimalsFor, formatPrice } from "@/lib/binaryPricing";
import type { BinaryAsset } from "@/lib/binaryTypes";
import type { LivePrice } from "@/hooks/useBinaryPrices";

export type ChartStyle = "candles" | "area" | "line";

export interface CandleRow {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  finalized: boolean;
}

export interface MarkerTrade {
  id: string;
  direction: "call" | "put";
  stake: number;
  entryPrice: number;
  exitPrice: number | null;
  openedAt: number;
  expiresAt: number;
  status: string;
  result: string | null;
  potentialPayout: number;
}

interface Props {
  asset: BinaryAsset;
  live?: LivePrice;
  style: ChartStyle;
  stepMs: number;
  candles: CandleRow[];
  markers: MarkerTrade[];
  now: number;
}

/** Resolve the design-system HSL tokens into concrete colours for the canvas renderer. */
function useTokens(el: HTMLElement | null) {
  return useMemo(() => {
    const styles = el ? getComputedStyle(el) : null;
    const token = (name: string, fallback: string) => {
      const raw = styles?.getPropertyValue(name).trim();
      return raw ? `hsl(${raw})` : fallback;
    };
    const alpha = (name: string, a: number, fallback: string) => {
      const raw = styles?.getPropertyValue(name).trim();
      return raw ? `hsla(${raw} / ${a})` : fallback;
    };
    return {
      text: token("--muted-foreground", "#94a3b8"),
      grid: alpha("--border", 0.35, "rgba(148,163,184,0.2)"),
      border: alpha("--border", 0.6, "rgba(148,163,184,0.35)"),
      up: token("--accent", "#22c55e"),
      down: token("--destructive", "#ef4444"),
      primary: token("--primary", "#22d3ee"),
      primaryFill: alpha("--primary", 0.28, "rgba(34,211,238,0.28)"),
      primaryFade: alpha("--primary", 0.02, "rgba(34,211,238,0.02)"),
      onPrimary: token("--primary-foreground", "#03121a"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el]);
}

/**
 * TradingView Lightweight Charts renderer.
 *
 * The series is fed from the platform's immutable candle state, so the chart
 * graphics come from TradingView while the prices remain exactly the ones the
 * backend uses to settle trades.
 */
export function LightweightChartView({ asset, live, style, stepMs, candles, markers, now }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | ISeriesApi<"Line"> | null>(null);
  const linesRef = useRef<Map<string, IPriceLine>>(new Map());
  const seededRef = useRef<string>("");

  const tokens = useTokens(hostRef.current);
  const decimals = decimalsFor(asset);
  const seriesKey = `${asset.symbol}:${stepMs}:${style}`;

  // ---- create / recreate the chart when the renderer type or instrument changes ----
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = createChart(host, {
      layout: {
        background: { color: "transparent" },
        textColor: tokens.text,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: tokens.grid },
        horzLines: { color: tokens.grid },
      },
      rightPriceScale: {
        borderColor: tokens.border,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: tokens.border,
        timeVisible: true,
        secondsVisible: stepMs < 60_000,
        // Reserved right-hand price area: the newest candle stops before the edge.
        rightOffset: 6,
        barSpacing: stepMs <= 5_000 ? 5 : 8,
        lockVisibleTimeRangeOnResize: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: tokens.border, labelBackgroundColor: tokens.primary },
        horzLine: { color: tokens.border, labelBackgroundColor: tokens.primary },
      },
      localization: {
        locale: "en-US",
        priceFormatter: (price: number) => price.toFixed(decimals),
      },
      autoSize: true,
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
    });

    const priceFormat = {
      type: "price" as const,
      precision: decimals,
      minMove: Number(Math.pow(10, -decimals).toFixed(decimals)),
    };

    const series =
      style === "candles"
        ? chart.addSeries(CandlestickSeries, {
            upColor: tokens.up,
            downColor: tokens.down,
            borderUpColor: tokens.up,
            borderDownColor: tokens.down,
            wickUpColor: tokens.up,
            wickDownColor: tokens.down,
            priceFormat,
            priceLineVisible: true,
            priceLineStyle: LineStyle.Dashed,
            priceLineColor: tokens.primary,
            lastValueVisible: true,
          })
        : style === "area"
          ? chart.addSeries(AreaSeries, {
              lineColor: tokens.primary,
              topColor: tokens.primaryFill,
              bottomColor: tokens.primaryFade,
              lineWidth: 2,
              priceFormat,
              priceLineVisible: true,
              priceLineStyle: LineStyle.Dashed,
              priceLineColor: tokens.primary,
            })
          : chart.addSeries(LineSeries, {
              color: tokens.primary,
              lineWidth: 2,
              priceFormat,
              priceLineVisible: true,
              priceLineStyle: LineStyle.Dashed,
              priceLineColor: tokens.primary,
            });

    chartRef.current = chart;
    seriesRef.current = series;
    linesRef.current = new Map();
    seededRef.current = "";

    return () => {
      linesRef.current.clear();
      seriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, decimals]);

  // ---- feed the immutable candle state into the series ----
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || candles.length === 0) return;

    const toPoint = (c: CandleRow) =>
      style === "candles"
        ? { time: (c.t / 1000) as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }
        : { time: (c.t / 1000) as UTCTimestamp, value: c.close };

    if (seededRef.current !== seriesKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      series.setData(candles.map(toPoint) as any);
      chart.timeScale().scrollToRealTime();
      seededRef.current = seriesKey;
      return;
    }

    // Only the active candle changes; closed candles were already committed to
    // the series on the ticks that formed them and are never rewritten.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series.update(toPoint(candles[candles.length - 1]) as any);
  }, [candles, style, seriesKey]);

  // ---- fixed entry-price lines, one per trade ----
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const lines = linesRef.current;
    const seen = new Set<string>();

    for (const trade of markers) {
      seen.add(trade.id);
      const call = trade.direction === "call";
      const active = trade.status === "open";
      const remaining = Math.max(0, Math.ceil((trade.expiresAt - now) / 1000));
      const mm = Math.floor(remaining / 60);
      const clock = mm > 0 ? `${mm}:${String(remaining % 60).padStart(2, "0")}` : `${remaining}s`;
      const title = `${call ? "BUY" : "SELL"} $${trade.stake.toFixed(2)} · ${formatPrice(asset, trade.entryPrice)}${
        active ? ` · ${clock}` : ""
      }`;
      const options = {
        price: trade.entryPrice,
        color: call ? tokens.up : tokens.down,
        lineWidth: 1 as const,
        lineStyle: active ? LineStyle.Dashed : LineStyle.SparseDotted,
        axisLabelVisible: true,
        title,
      };

      const existing = lines.get(trade.id);
      if (existing) existing.applyOptions(options);
      else lines.set(trade.id, series.createPriceLine(options));
    }

    for (const [id, line] of lines) {
      if (seen.has(id)) continue;
      series.removePriceLine(line);
      lines.delete(id);
    }
  }, [markers, now, asset, tokens.up, tokens.down]);

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" />
      {live && (
        <div className="pointer-events-none absolute left-3 top-2 text-[10px] font-mono tabular-nums text-muted-foreground">
          {asset.symbol} · {formatPrice(asset, live.price)}
        </div>
      )}
    </div>
  );
}
