/**
 * Deterministic synthetic price engine.
 *
 * The exact same algorithm runs in the edge function
 * (supabase/functions/_shared/binary-pricing.ts) so that the price a user sees
 * in the browser matches the price the backend uses to settle a trade.
 *
 * Prices are a pure function of (symbol, timestamp) — no random state.
 */

export type VolatilityLevel = "low" | "medium" | "high" | "extreme";

export interface PricingAsset {
  symbol: string;
  base_price: number;
  volatility_level: string;
  category: string;
}

const VOL_FACTOR: Record<string, number> = {
  low: 0.0006,
  medium: 0.0018,
  high: 0.0045,
  extreme: 0.009,
};

/** Stable 32-bit string hash. */
function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pseudo random in [0,1) from an integer seed. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function specialBehaviour(symbol: string) {
  const s = symbol.toLowerCase();
  if (s.startsWith("crash")) return { kind: "crash" as const, ticks: Number(s.replace(/\D/g, "")) || 500 };
  if (s.startsWith("boom")) return { kind: "boom" as const, ticks: Number(s.replace(/\D/g, "")) || 500 };
  if (s.startsWith("step")) return { kind: "step" as const, ticks: 0 };
  if (s.startsWith("jump")) return { kind: "jump" as const, ticks: 0 };
  if (s.startsWith("range break")) return { kind: "range" as const, ticks: 0 };
  return { kind: "normal" as const, ticks: 0 };
}

export const TICK_MS = 500;

/**
 * Price of an asset at a given moment in time.
 * Quantised to TICK_MS so client and server agree even with small clock drift.
 */
export function priceAt(asset: PricingAsset, atMs: number = Date.now()): number {
  const tick = Math.floor(atMs / TICK_MS);
  const seed = hashCode(asset.symbol);
  const vol = VOL_FACTOR[asset.volatility_level] ?? VOL_FACTOR.medium;
  const behaviour = specialBehaviour(asset.symbol);

  // Layered deterministic waves → smooth, organic looking drift.
  const t = tick;
  let drift = 0;
  const layers = [
    { period: 2400, amp: 1.0 },
    { period: 740, amp: 0.55 },
    { period: 213, amp: 0.3 },
    { period: 61, amp: 0.16 },
    { period: 17, amp: 0.08 },
  ];
  for (let i = 0; i < layers.length; i++) {
    const { period, amp } = layers[i];
    const phase = seeded(seed + i * 977) * Math.PI * 2;
    drift += Math.sin((t / period) * Math.PI * 2 + phase) * amp;
  }
  // Micro tick noise keeps consecutive ticks from looking too smooth.
  drift += (seeded(seed + t) - 0.5) * 0.35;

  let multiplier = 1 + drift * vol;

  if (behaviour.kind === "step") {
    // Step index moves in fixed increments.
    multiplier = 1 + Math.round(drift * 6) * 0.0004;
  }

  if (behaviour.kind === "jump") {
    // Occasional discontinuous jumps.
    const jumpWindow = Math.floor(t / 120);
    if (seeded(seed + jumpWindow * 31) > 0.82) {
      multiplier *= 1 + (seeded(seed + jumpWindow * 57) - 0.5) * vol * 12;
    }
  }

  if (behaviour.kind === "crash" || behaviour.kind === "boom") {
    // Long slow grind with rare violent spike in one direction.
    const dir = behaviour.kind === "crash" ? -1 : 1;
    const window = Math.floor(t / Math.max(30, behaviour.ticks / 10));
    const isSpike = seeded(seed + window * 13) > 0.93;
    multiplier = 1 - dir * Math.abs(drift) * vol * 0.35;
    if (isSpike) multiplier *= 1 + dir * vol * 9;
  }

  if (behaviour.kind === "range") {
    // Bounded oscillation that periodically breaks out.
    const window = Math.floor(t / 400);
    const breakout = seeded(seed + window * 71) > 0.8 ? 2.4 : 1;
    multiplier = 1 + Math.sin((t / 90) * Math.PI * 2 + seeded(seed) * 6) * vol * breakout;
  }

  const price = asset.base_price * multiplier;
  return price > 0 ? price : asset.base_price * 0.01;
}

/** Percentage change over the trailing 24h window. */
export function dailyChange(asset: PricingAsset, atMs: number = Date.now()): number {
  const now = priceAt(asset, atMs);
  const then = priceAt(asset, atMs - 24 * 60 * 60 * 1000);
  return ((now - then) / then) * 100;
}

/** Historical series for sparklines / charts. */
export function priceSeries(
  asset: PricingAsset,
  points: number,
  stepMs: number,
  endMs: number = Date.now()
): { t: number; price: number }[] {
  const out: { t: number; price: number }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = endMs - i * stepMs;
    out.push({ t, price: priceAt(asset, t) });
  }
  return out;
}

/** Number of decimals appropriate for display. */
export function decimalsFor(asset: PricingAsset): number {
  const p = asset.base_price;
  if (p < 1) return 5;
  if (p < 10) return 4;
  if (p < 1000) return p >= 100 ? 3 : 4;
  return 2;
}

export function formatPrice(asset: PricingAsset, value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimalsFor(asset),
    maximumFractionDigits: decimalsFor(asset),
  });
}

/** Forex markets close over the weekend; everything else trades 24/7. */
export function isMarketOpen(marketHours: string, at: Date = new Date()): boolean {
  if (marketHours !== "forex") return true;
  const day = at.getUTCDay();
  const hour = at.getUTCHours();
  if (day === 6) return false;
  if (day === 0) return hour >= 21;
  if (day === 5) return hour < 21;
  return true;
}

export interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * OHLC candles derived from the same deterministic tick engine that settles
 * trades, so every asset (forex, indices, synthetics, OTC…) has candlesticks.
 */
export function candleSeries(
  asset: PricingAsset,
  points: number,
  stepMs: number,
  endMs: number = Date.now()
): Candle[] {
  const out: Candle[] = [];
  const subTicks = Math.max(2, Math.min(40, Math.round(stepMs / TICK_MS)));
  const sub = stepMs / subTicks;
  for (let i = points - 1; i >= 0; i--) {
    const start = endMs - i * stepMs;
    let high = -Infinity;
    let low = Infinity;
    let open = 0;
    let close = 0;
    for (let k = 0; k <= subTicks; k++) {
      const at = Math.min(start + k * sub, endMs);
      const p = priceAt(asset, at);
      if (k === 0) open = p;
      close = p;
      if (p > high) high = p;
      if (p < low) low = p;
    }
    out.push({ t: start, open, high, low, close });
  }
  return out;
}
