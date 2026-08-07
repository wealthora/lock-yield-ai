/**
 * Single source of truth for a market quote.
 *
 * Every surface in the binary options terminal (ticker cards, asset list,
 * chart header, trade panel, active trades, history) reads its numbers from a
 * Quote produced here, so the same symbol never shows two different prices.
 */
import { TICK_MS, priceAt, dailyChange, isMarketOpen } from "./binaryPricing";
import type { BinaryAsset } from "./binaryTypes";

export interface Quote {
  symbol: string;
  /** Mid price — what the chart and settlement engine use. */
  price: number;
  /** Previous tick's mid price, for up/down flash colouring. */
  prev: number;
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  open: boolean;
  /** Payout rate currently offered on this asset (%). */
  payout: number;
  /** Epoch ms of this quote. */
  ts: number;
}

export function buildQuote(asset: BinaryAsset, prev: number | undefined, atMs: number): Quote {
  const quoteTs = Math.floor(atMs / TICK_MS) * TICK_MS;
  const price = priceAt(asset, quoteTs);
  const spread = Number(asset.spread) || 0;
  return {
    symbol: asset.symbol,
    price,
    prev: prev ?? price,
    bid: price - spread / 2,
    ask: price + spread / 2,
    spread,
    change24h: dailyChange(asset, quoteTs),
    open: isMarketOpen(asset.market_hours, new Date(quoteTs)) && asset.is_active && !asset.is_suspended,
    payout: Number(asset.payout_percent),
    ts: quoteTs,
  };
}

export const isOtc = (asset: { category: string; symbol: string }) =>
  asset.category === "otc" || asset.symbol.toUpperCase().includes(" OTC");
