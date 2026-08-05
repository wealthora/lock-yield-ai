import { PricingAsset, priceSeries, priceAt } from "./binaryPricing";

export interface BinaryInsights {
  trend: "bullish" | "bearish" | "neutral";
  sentiment: string;
  momentum: number; // 0-100
  buyProbability: number;
  sellProbability: number;
  volatility: { level: string; value: number };
  support: number;
  resistance: number;
  confidence: number;
  news: { headline: string; impact: "positive" | "negative" | "neutral" };
  suggestedExpiry: number;
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

  return {
    trend,
    sentiment:
      trend === "bullish" ? "Risk-on / accumulation" : trend === "bearish" ? "Risk-off / distribution" : "Balanced",
    momentum: Math.round(momentum),
    buyProbability,
    sellProbability,
    volatility: { level: volLevel, value: Number(realisedVol.toFixed(3)) },
    support: low + (high - low) * 0.15,
    resistance: high - (high - low) * 0.15,
    confidence,
    news: NEWS_POOL[newsIndex],
    suggestedExpiry,
  };
}

export function currentPrice(asset: PricingAsset) {
  return priceAt(asset);
}
