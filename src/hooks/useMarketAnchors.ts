import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { anchorAsset, usesAnchorFeed, type MarketAnchor } from "@/lib/marketAnchors";
import type { BinaryAsset } from "@/lib/binaryTypes";

const READ_MS = 20_000;
const REFRESH_MS = 2 * 60_000;

/** Latest real-price anchors, keyed by asset symbol. */
export function useMarketAnchors(enabled: boolean) {
  const [anchors, setAnchors] = useState<Record<string, MarketAnchor>>({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const read = async () => {
      const { data } = await supabase.from("market_anchors").select("symbol, price, anchor_ts");
      if (cancelled || !data) return;
      const map: Record<string, MarketAnchor> = {};
      for (const row of data) {
        map[row.symbol as string] = {
          symbol: row.symbol as string,
          price: Number(row.price),
          anchor_ts: row.anchor_ts as string,
        };
      }
      setAnchors(map);
    };

    // The function self-throttles to stay inside the provider's free quota.
    const refresh = () => supabase.functions.invoke("market-anchors").catch(() => undefined);

    read();
    refresh();
    const readId = window.setInterval(read, READ_MS);
    const refreshId = window.setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(readId);
      window.clearInterval(refreshId);
    };
  }, [enabled]);

  return anchors;
}

/** Assets rebased onto their latest real price where an anchor feed applies. */
export function useAnchoredAssets(assets: BinaryAsset[]): BinaryAsset[] {
  const needsAnchors = useMemo(() => assets.some(usesAnchorFeed), [assets]);
  const anchors = useMarketAnchors(needsAnchors);
  return useMemo(
    () => assets.map((a) => anchorAsset(a, anchors[a.symbol])),
    [assets, anchors]
  );
}
