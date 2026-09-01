import { BinaryChart } from "@/components/binary/BinaryChart";
import { useBinaryPrices } from "@/hooks/useBinaryPrices";
import type { BinaryAsset } from "@/lib/binaryTypes";

const asset = {
  id: "1", symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", tv_symbol: "FX:EURUSD",
  base_price: 1.0850, spread: 0.0002, volatility_level: "medium", payout_percent: 85,
  min_trade: 1, max_trade: 100, market_hours: "24/7", is_active: true, is_suspended: false, sort_order: 1,
} as BinaryAsset;

export default function TvSmoke() {
  const prices = useBinaryPrices([asset]);
  return <div className="p-6"><BinaryChart asset={asset} live={prices[asset.symbol]} trades={[]} /></div>;
}
