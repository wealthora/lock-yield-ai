/**
 * Real market data for trade execution and settlement (Binance public API).
 *
 * Crypto assets settle on the genuine market price shown on TradingView, using
 * the same BINANCE:<PAIR> feed the browser streams. Any asset without a real
 * pair (OTC, synthetics, and categories with no free feed) falls back to the
 * deterministic Wealthora engine.
 */
const QUOTE_ALIASES: Record<string, string> = { USD: "USDT", USDT: "USDT", USDC: "USDC" };

export interface FeedAsset {
  symbol: string;
  category: string;
  tv_symbol?: string | null;
}

export function binanceSymbol(asset: FeedAsset): string | null {
  if (asset.category !== "crypto") return null;
  if (asset.symbol.toUpperCase().includes("OTC")) return null;

  const tv = (asset.tv_symbol ?? "").toUpperCase();
  if (tv.startsWith("BINANCE:")) return tv.slice("BINANCE:".length).replace(/\.P$/, "");

  const parts = asset.symbol.toUpperCase().replace(/\s/g, "").split("/");
  if (parts.length !== 2) return null;
  const mapped = QUOTE_ALIASES[parts[1]];
  return mapped ? `${parts[0]}${mapped}` : null;
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Current spot mid price. */
export async function spotPrice(pair: string): Promise<number | null> {
  const data = (await getJson(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${pair}`)) as
    | { bidPrice?: string; askPrice?: string }
    | null;
  if (data?.bidPrice && data?.askPrice) {
    const mid = (Number(data.bidPrice) + Number(data.askPrice)) / 2;
    if (Number.isFinite(mid) && mid > 0) return mid;
  }
  const last = (await getJson(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`)) as
    | { price?: string }
    | null;
  const price = Number(last?.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** Traded price at a specific instant, from the 1-second kline that contains it. */
export async function priceAtMs(pair: string, atMs: number): Promise<number | null> {
  const start = Math.floor(atMs / 1000) * 1000;
  const rows = (await getJson(
    `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1s&startTime=${start - 5000}&endTime=${start + 1000}&limit=10`
  )) as unknown[][] | null;

  if (Array.isArray(rows) && rows.length > 0) {
    // Prefer the candle covering the instant; otherwise the latest one before it.
    const match = rows.filter((r) => Number(r[0]) <= start).pop() ?? rows[rows.length - 1];
    const close = Number(match?.[4]);
    if (Number.isFinite(close) && close > 0) return close;
  }
  return null;
}

/**
 * Real price for an asset at a timestamp, or null when no real feed applies.
 * Recent instants use spot (matching what the trader just saw), older instants
 * use the historical 1-second candle.
 */
export async function realPriceAt(asset: FeedAsset, atMs: number): Promise<number | null> {
  const pair = binanceSymbol(asset);
  if (!pair) return null;
  const age = Date.now() - atMs;
  if (age < 2000) return (await spotPrice(pair)) ?? (await priceAtMs(pair, atMs));
  return (await priceAtMs(pair, atMs)) ?? (await spotPrice(pair));
}
