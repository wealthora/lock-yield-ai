export interface BinaryAsset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  tv_symbol: string | null;
  base_price: number;
  spread: number;
  volatility_level: string;
  payout_percent: number;
  min_trade: number;
  max_trade: number;
  market_hours: string;
  is_active: boolean;
  is_suspended: boolean;
  sort_order: number;
}

export interface BinaryTrade {
  id: string;
  user_id: string;
  symbol: string;
  category: string;
  direction: "call" | "put";
  stake: number;
  entry_price: number;
  exit_price: number | null;
  payout_percent: number;
  potential_payout: number;
  profit_loss: number | null;
  expiry_seconds: number;
  opened_at: string;
  expires_at: string;
  settled_at: string | null;
  status: string;
  result: string | null;
}

export interface BinarySettings {
  trading_enabled: boolean;
  global_min_trade: number;
  global_max_trade: number;
  max_open_trades: number;
  max_user_exposure: number;
  max_platform_exposure: number;
  expiry_options: number[];
}
