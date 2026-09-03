import { useEffect, useState } from "react";
import { binanceSymbol, fetchKlines, klineInterval } from "@/lib/marketData";
import type { BinaryAsset } from "@/lib/binaryTypes";
import type { CandleRow } from "@/components/binary/LightweightChartView";
import type { LivePrice } from "./useBinaryPrices";

interface State {
  key: string;
  history: CandleRow[];
  active: CandleRow | null;
}

/**
 * Real market candles from Binance (the same series TradingView renders).
 * Closed candles are loaded once and never rewritten; only the active candle
 * moves, driven by the live quote used for execution.
 */
export function useRealCandles(asset: BinaryAsset, stepMs: number, live?: LivePrice): CandleRow[] | null {
  const pair = binanceSymbol(asset);
  const { interval, stepMs: realStep } = klineInterval(stepMs);
  const key = pair ? `${pair}:${interval}` : "";
  const [state, setState] = useState<State>({ key: "", history: [], active: null });

  useEffect(() => {
    if (!pair) return;
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await fetchKlines(pair, interval, 200);
        if (cancelled || rows.length === 0) return;
        const last = rows[rows.length - 1];
        setState({
          key,
          history: rows.slice(0, -1).map((r) => ({ ...r, finalized: true })),
          active: { ...last, finalized: false },
        });
      } catch {
        if (!cancelled) setState({ key: "", history: [], active: null });
      }
    };

    load();
    // Refresh periodically so long-lived sessions stay aligned with the exchange.
    const id = window.setInterval(load, Math.max(30_000, realStep * 5));
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Advance the active candle with the live execution price.
  useEffect(() => {
    if (!pair || !live) return;
    const start = Math.floor(live.ts / realStep) * realStep;

    setState((current) => {
      if (current.key !== key || !current.active) return current;
      const price = live.price;

      if (start === current.active.t) {
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
      if (start < current.active.t) return current;

      const finalized: CandleRow = { ...current.active, finalized: true };
      return {
        key,
        history: [...current.history, finalized].slice(-200),
        active: { t: start, open: finalized.close, high: Math.max(finalized.close, price), low: Math.min(finalized.close, price), close: price, finalized: false },
      };
    });
  }, [pair, key, realStep, live?.price, live?.ts]);

  if (!pair) return null;
  if (state.key !== key || !state.active) return [];
  return [...state.history, state.active];
}
