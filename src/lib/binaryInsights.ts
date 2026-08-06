import { PricingAsset, priceSeries, priceAt } from "./binaryPricing";

export interface BinaryInsights {
  trend: "bullish" | "bearish" | "neutral";
  sentiment: string;
  momentum: number; // 0-100
  rsi: number; // 0-100
  macd: { value: number; signal: number; histogram: number; bias: "bullish" | "bearish" };
  buyProbability: number;
  sellProbability: number;
  volatility: { level: string; value: number };
  support: number;
  resistance: number;
  confidence: number;
  news: { headline: string; impact: "positive" | "negative" | "neutral" };
  suggestedExpiry: number;
  updatedAt: number;
}


const NEWS_POOL = [
  { headline: "Liquidity deepening across major venues", impact: "positive" as const },
  { headline: "Risk appetite improving into the session", impact: "positive" as const },
  { headline: "Profit taking capping upside attempts", impact: "negative" as const },
  { headline: "Macro calendar light — range conditions likely", impact: "neutral" as const },
  { headline: "Elevated order flow imbalance detected", impact: "negative" as const },
  { headline: "Momentum funds rotating into the asset", impact: "positive" as const },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Derives insight metrics from the deterministic price series. Purely analytical
 * (moving averages, range position, realised volatility) — no promises implied.
 */
export function computeInsights(asset: PricingAsset, atMs: number = Date.now()): BinaryInsights {
  const series = priceSeries(asset, 120, 5000, atMs).map((p) => p.price);
  const last = series[series.length - 1];
  const fast = series.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const slow = series.slice(-40).reduce((a, b) => a + b, 0) / 40;

  const spreadPct = ((fast - slow) / slow) * 100;
  const trend: BinaryInsights["trend"] =
    spreadPct > 0.02 ? "bullish" : spreadPct < -0.02 ? "bearish" : "neutral";

  const high = Math.max(...series);
  const low = Math.min(...series);
  const rangePos = high === low ? 0.5 : (last - low) / (high - low);

  const returns = series.slice(1).map((p, i) => (p - series[i]) / series[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const realisedVol = Math.sqrt(variance) * 100;

  const momentum = clamp(50 + spreadPct * 900, 2, 98);
  const buyProbability = Math.round(clamp(momentum * 0.6 + (1 - rangePos) * 40, 5, 95));
  const sellProbability = 100 - buyProbability;

  const volLevel =
    realisedVol < 0.02 ? "Low" : realisedVol < 0.06 ? "Moderate" : realisedVol < 0.15 ? "High" : "Extreme";

  const confidence = Math.round(
    clamp(40 + Math.abs(momentum - 50) * 0.9 - (realisedVol > 0.15 ? 12 : 0), 35, 94)
  );

  const newsIndex = Math.floor(atMs / (5 * 60 * 1000)) % NEWS_POOL.length;

  const suggestedExpiry = realisedVol > 0.12 ? 60 : realisedVol > 0.05 ? 180 : 300;

  // Wilder RSI over the last 14 changes.
  const changes = series.slice(-15).map((p, i, arr) => (i === 0 ? 0 : p - arr[i - 1])).slice(1);
  const gains = changes.filter((c) => c > 0).reduce((a, b) => a + b, 0) / 14;
  const losses = Math.abs(changes.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / 14;
  const rsi = losses === 0 ? 100 : Math.round(clamp(100 - 100 / (1 + gains / losses), 1, 99));

  // MACD (12, 26, 9) expressed in basis points for readability.
  const ema = (values: number[], period: number) => {
    const k = 2 / (period + 1);
    return values.reduce((acc, v, i) => (i === 0 ? v : v * k + acc * (1 - k)), 0);
  };
  const macdSeries = series.map((_, i) =>
    i < 26 ? 0 : ema(series.slice(0, i + 1).slice(-12), 12) - ema(series.slice(0, i + 1).slice(-26), 26)
  );
  const macdValue = macdSeries[macdSeries.length - 1];
  const macdSignal = ema(macdSeries.slice(-9), 9);
  const toBps = (v: number) => Number(((v / last) * 10000).toFixed(2));

  return {
    trend,
    sentiment:
      trend === "bullish" ? "Risk-on / accumulation" : trend === "bearish" ? "Risk-off / distribution" : "Balanced",
    momentum: Math.round(momentum),
    rsi,
    macd: {
      value: toBps(macdValue),
      signal: toBps(macdSignal),
      histogram: toBps(macdValue - macdSignal),
      bias: macdValue >= macdSignal ? ("bullish" as const) : ("bearish" as const),
    },
    buyProbability,
    sellProbability,
    volatility: { level: volLevel, value: Number(realisedVol.toFixed(3)) },
    support: low + (high - low) * 0.15,
    resistance: high - (high - low) * 0.15,
    confidence,
    news: NEWS_POOL[newsIndex],
    suggestedExpiry,
    updatedAt: atMs,
  };
}


export function currentPrice(asset: PricingAsset) {
  return priceAt(asset);
}
