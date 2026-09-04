/**
 * Real-price anchoring for the categories without a live browser feed
 * (forex, commodities, US stocks — sourced from Twelve Data).
 *
 * An anchor is the last real price observed for a symbol plus the instant it was
 * observed. Since every engine price is `base_price * multiplier(symbol, t)`,
 * rescaling `base_price` lifts the entire series (ticker, chart, candles,
 * sparkline) onto the real market level while keeping it perfectly continuous.
 * The edge function applies the identical scale when it fills and settles
 * trades, so displayed prices are the executed prices.
 */
import { priceAt } from "./binaryPricing";
import type { BinaryAsset } from "./binaryTypes";

export interface MarketAnchor {
  symbol: string;
  price: number;
  anchor_ts: string;
}

/** Categories that get their real prices from the anchor feed. */
export const ANCHORED_CATEGORIES = ["forex", "commodities", "stocks"];

export const usesAnchorFeed = (asset: Pick<BinaryAsset, "category" | "symbol">) =>
  ANCHORED_CATEGORIES.includes(asset.category) && !asset.symbol.toUpperCase().includes("OTC");

/** Return the asset rebased onto its latest real price, or unchanged. */
export function anchorAsset(asset: BinaryAsset, anchor?: MarketAnchor): BinaryAsset {
  if (!anchor || !usesAnchorFeed(asset)) return asset;
  const atMs = new Date(anchor.anchor_ts).getTime();
  if (!Number.isFinite(atMs)) return asset;
  const engine = priceAt(asset, atMs);
  if (!(engine > 0) || !(anchor.price > 0)) return asset;
  const scale = anchor.price / engine;
  if (!Number.isFinite(scale) || scale <= 0) return asset;
  return { ...asset, base_price: asset.base_price * scale, spread: asset.spread * scale };
}
