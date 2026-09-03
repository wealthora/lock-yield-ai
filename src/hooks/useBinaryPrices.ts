import { useEffect, useMemo, useRef, useState } from "react";
import { TICK_MS, priceSeries } from "@/lib/binaryPricing";
import { buildQuote, type Quote } from "@/lib/binaryQuotes";
import type { BinaryAsset } from "@/lib/binaryTypes";
import { useRealMarketPrices } from "./useRealMarketPrices";

/** Kept as an alias so existing imports keep working. */
export type LivePrice = Quote;

/**
 * Streams live quotes for a set of assets. Assets with a real market feed
 * (Binance — the same data TradingView charts show) use those prices; the rest
 * use the deterministic Wealthora engine. One interval drives the whole
 * terminal, so every component renders the exact same price for a symbol.
 */
export function useBinaryPrices(assets: BinaryAsset[], intervalMs = TICK_MS) {
  const [prices, setPrices] = useState<Record<string, Quote>>({});
  const prevRef = useRef<Record<string, number>>({});
  const assetsRef = useRef<BinaryAsset[]>(assets);
  assetsRef.current = assets;

  const real = useRealMarketPrices(assets);
  const realRef = useRef(real);
  realRef.current = real;

  const key = useMemo(() => assets.map((a) => a.symbol).join("|"), [assets]);

  useEffect(() => {
    if (assetsRef.current.length === 0) return;

    const tick = () => {
      const now = Date.now();
      const next: Record<string, Quote> = {};
      for (const asset of assetsRef.current) {
        const base = buildQuote(asset, prevRef.current[asset.symbol], now);
        const live = realRef.current[asset.symbol];
        next[asset.symbol] = live
          ? {
              ...base,
              price: live.price,
              prev: prevRef.current[asset.symbol] ?? live.price,
              bid: live.bid,
              ask: live.ask,
              spread: Number((live.ask - live.bid).toFixed(8)),
              change24h: live.change24h,
              ts: base.ts,
            }
          : base;
        prevRef.current[asset.symbol] = next[asset.symbol].price;
      }
      setPrices(next);
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [key, intervalMs]);

  return prices;
}

/** Deterministic sparkline points for an asset — synced with the live feed. */
export function useSparkline(asset: BinaryAsset, points = 24, stepMs = 5000, refreshMs = 2000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);

  return useMemo(
    () => priceSeries(asset, points, stepMs).map((p) => p.price),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asset.symbol, points, stepMs, Math.floor(Date.now() / refreshMs)]
  );
}

/** A ticking clock, for countdowns. */
export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
