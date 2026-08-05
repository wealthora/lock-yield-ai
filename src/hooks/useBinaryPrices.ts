import { useEffect, useRef, useState } from "react";
import { PricingAsset, priceAt, dailyChange, TICK_MS } from "@/lib/binaryPricing";

export interface LivePrice {
  price: number;
  prev: number;
  change24h: number;
}

/**
 * Ticks live synthetic prices for a set of assets. Prices are deterministic
 * functions of wall-clock time, so they match the backend at settlement.
 */
export function useBinaryPrices(assets: PricingAsset[], intervalMs = TICK_MS) {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const prevRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (assets.length === 0) return;

    const tick = () => {
      const now = Date.now();
      const next: Record<string, LivePrice> = {};
      for (const asset of assets) {
        const price = priceAt(asset, now);
        next[asset.symbol] = {
          price,
          prev: prevRef.current[asset.symbol] ?? price,
          change24h: dailyChange(asset, now),
        };
        prevRef.current[asset.symbol] = price;
      }
      setPrices(next);
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
    // Re-run when the tradable set changes.
  }, [assets.map((a) => a.symbol).join("|"), intervalMs]);

  return prices;
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
