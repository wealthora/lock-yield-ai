/**
 * Real market data mapping (Binance public API).
 *
 * Crypto assets are traded on genuine TradingView-equivalent prices: the same
 * BINANCE:<PAIR> stream TradingView charts show. Every other category (and all
 * OTC/synthetic instruments) keeps the deterministic Wealthora feed.
 */
import type { BinaryAsset } from "./binaryTypes";

const QUOTE_ALIASES: Record<string, string> = { USD: "USDT", USDT: "USDT", USDC: "USDC" };

/** Resolve the Binance trading pair for an asset, or null when it has no real feed. */
export function binanceSymbol(asset: Pick<BinaryAsset, "symbol" | "category" | "tv_symbol">): string | null {
  if (asset.category !== "crypto") return null;
  if (asset.symbol.toUpperCase().includes("OTC")) return null;

  const tv = asset.tv_symbol?.toUpperCase() ?? "";
  if (tv.startsWith("BINANCE:")) return tv.slice("BINANCE:".length).replace(/\.P$/, "");

  const parts = asset.symbol.toUpperCase().replace(/\s/g, "").split("/");
  if (parts.length !== 2) return null;
  const [base, quote] = parts;
  const mapped = QUOTE_ALIASES[quote];
  return mapped ? `${base}${mapped}` : null;
}

export const hasRealFeed = (asset: Pick<BinaryAsset, "symbol" | "category" | "tv_symbol">) =>
  binanceSymbol(asset) !== null;

/** Binance kline interval that best represents a chart timeframe. */
export function klineInterval(stepMs: number): { interval: string; stepMs: number } {
  if (stepMs <= 1000) return { interval: "1s", stepMs: 1000 };
  if (stepMs < 60_000) return { interval: "1s", stepMs: 1000 };
  if (stepMs < 300_000) return { interval: "1m", stepMs: 60_000 };
  if (stepMs < 900_000) return { interval: "5m", stepMs: 300_000 };
  if (stepMs < 3_600_000) return { interval: "15m", stepMs: 900_000 };
  return { interval: "1h", stepMs: 3_600_000 };
}

export interface RawKline {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchKlines(pair: string, interval: string, limit = 200): Promise<RawKline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`klines ${res.status}`);
  const rows = (await res.json()) as unknown[][];
  return rows.map((r) => ({
    t: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
  }));
}
