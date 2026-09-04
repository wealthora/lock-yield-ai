/**
 * Twelve Data real market prices for the categories Binance does not cover
 * (forex, commodities and US stocks).
 *
 * Prices are stored as "anchors" in public.market_anchors: the last real price
 * observed for a symbol together with the instant it was observed. Both the
 * browser and this edge function rebase the deterministic Wealthora engine onto
 * the newest anchor, so the chart, ticker and trade settlement all agree on the
 * same real-world price level.
 */
export interface FeedAssetLike {
  symbol: string;
  category: string;
}

/** Twelve Data symbol for an asset, or null when it has no supported feed. */
export function twelveDataSymbol(asset: FeedAssetLike): string | null {
  const symbol = asset.symbol.toUpperCase();
  if (symbol.includes("OTC")) return null;

  switch (asset.category) {
    case "forex":
      return /^[A-Z]{3}\/[A-Z]{3}$/.test(symbol) ? symbol : null;
    case "commodities": {
      const map: Record<string, string> = {
        "XAU/USD": "XAU/USD",
        "XAG/USD": "XAG/USD",
        "WTI/USD": "WTI/USD",
        "NGAS/USD": "NG/USD",
        COPPER: "COPPER",
      };
      return map[symbol] ?? null;
    }
    case "stocks":
      return /^[A-Z.]{1,6}$/.test(symbol) ? symbol : null;
    default:
      // crypto uses the Binance feed; indices need a paid Twelve Data plan;
      // synthetic and OTC instruments are platform markets by design.
      return null;
  }
}

export interface AnchorRow {
  symbol: string;
  price: number;
  anchor_ts: string;
}

/**
 * Scale factor that maps the deterministic engine onto the real market level.
 * Because every engine price is `base_price * multiplier(symbol, t)`, scaling
 * base_price shifts the whole series (prices, candles, sparklines) onto the
 * real price without breaking continuity.
 */
export function anchorScale(engineAtAnchor: number, anchorPrice: number): number {
  if (!Number.isFinite(engineAtAnchor) || engineAtAnchor <= 0) return 1;
  if (!Number.isFinite(anchorPrice) || anchorPrice <= 0) return 1;
  return anchorPrice / engineAtAnchor;
}

/** Fetch spot prices for up to a handful of symbols in one Twelve Data call. */
export async function fetchTwelveDataPrices(
  symbols: string[],
  apiKey: string
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${apiKey}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`twelve-data ${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;

  const out: Record<string, number> = {};
  if (symbols.length === 1) {
    const price = Number((body as { price?: string }).price);
    if (Number.isFinite(price) && price > 0) out[symbols[0]] = price;
    return out;
  }
  for (const symbol of symbols) {
    const entry = body[symbol] as { price?: string } | undefined;
    const price = Number(entry?.price);
    if (Number.isFinite(price) && price > 0) out[symbol] = price;
  }
  return out;
}
