INSERT INTO public.binary_assets
  (symbol, name, category, tv_symbol, base_price, spread, volatility_level, payout_percent, min_trade, max_trade, market_hours, is_active, is_suspended, sort_order)
VALUES
  -- Commodities
  ('XAU/USD', 'Gold / US Dollar', 'commodities', 'OANDA:XAUUSD', 2385.40, 0.28, 'medium', 84, 1, 5000, 'forex', true, false, 60),
  ('XAG/USD', 'Silver / US Dollar', 'commodities', 'OANDA:XAGUSD', 28.42, 0.018, 'high', 85, 1, 5000, 'forex', true, false, 61),
  ('WTI/USD', 'Crude Oil WTI', 'commodities', 'TVC:USOIL', 78.62, 0.03, 'high', 85, 1, 5000, 'forex', true, false, 62),
  ('NGAS/USD', 'Natural Gas', 'commodities', 'TVC:NATURALGAS', 2.184, 0.004, 'extreme', 86, 1, 5000, 'forex', true, false, 63),
  ('COPPER', 'Copper', 'commodities', 'TVC:COPPER', 4.284, 0.005, 'medium', 83, 1, 5000, 'forex', true, false, 64),
  -- Indices
  ('US30', 'Dow Jones 30', 'indices', 'CAPITALCOM:US30', 38675.20, 2.4, 'medium', 84, 1, 5000, 'forex', true, false, 70),
  ('NAS100', 'Nasdaq 100', 'indices', 'CAPITALCOM:US100', 18242.60, 1.8, 'high', 85, 1, 5000, 'forex', true, false, 71),
  ('SPX500', 'S&P 500', 'indices', 'CAPITALCOM:US500', 5284.30, 0.6, 'medium', 84, 1, 5000, 'forex', true, false, 72),
  ('GER40', 'Germany 40', 'indices', 'CAPITALCOM:DE40', 18124.80, 2.1, 'medium', 84, 1, 5000, 'forex', true, false, 73),
  ('UK100', 'UK 100', 'indices', 'CAPITALCOM:UK100', 8214.50, 1.6, 'low', 83, 1, 5000, 'forex', true, false, 74),
  ('JP225', 'Japan 225', 'indices', 'CAPITALCOM:J225', 38942.10, 3.2, 'high', 85, 1, 5000, 'forex', true, false, 75),
  -- Stocks
  ('AAPL', 'Apple Inc.', 'stocks', 'NASDAQ:AAPL', 214.28, 0.06, 'medium', 82, 1, 5000, 'forex', true, false, 80),
  ('TSLA', 'Tesla Inc.', 'stocks', 'NASDAQ:TSLA', 248.72, 0.12, 'extreme', 86, 1, 5000, 'forex', true, false, 81),
  ('AMZN', 'Amazon.com Inc.', 'stocks', 'NASDAQ:AMZN', 186.44, 0.07, 'high', 84, 1, 5000, 'forex', true, false, 82),
  ('NVDA', 'NVIDIA Corp.', 'stocks', 'NASDAQ:NVDA', 124.86, 0.09, 'extreme', 86, 1, 5000, 'forex', true, false, 83),
  ('MSFT', 'Microsoft Corp.', 'stocks', 'NASDAQ:MSFT', 428.16, 0.10, 'low', 82, 1, 5000, 'forex', true, false, 84),
  ('META', 'Meta Platforms Inc.', 'stocks', 'NASDAQ:META', 492.34, 0.14, 'high', 84, 1, 5000, 'forex', true, false, 85),
  -- OTC (24/7)
  ('EUR/USD OTC', 'Euro / US Dollar OTC', 'otc', NULL, 1.08442, 0.00014, 'medium', 92, 1, 5000, '24_7', true, false, 90),
  ('GBP/USD OTC', 'British Pound / US Dollar OTC', 'otc', NULL, 1.27031, 0.00018, 'medium', 92, 1, 5000, '24_7', true, false, 91),
  ('USD/JPY OTC', 'US Dollar / Japanese Yen OTC', 'otc', NULL, 151.289, 0.016, 'medium', 91, 1, 5000, '24_7', true, false, 92),
  ('AUD/USD OTC', 'Australian Dollar / US Dollar OTC', 'otc', NULL, 0.65721, 0.00019, 'medium', 91, 1, 5000, '24_7', true, false, 93),
  ('USD/CAD OTC', 'US Dollar / Canadian Dollar OTC', 'otc', NULL, 1.36214, 0.00021, 'medium', 90, 1, 5000, '24_7', true, false, 94),
  ('EUR/JPY OTC', 'Euro / Japanese Yen OTC', 'otc', NULL, 164.312, 0.020, 'high', 92, 1, 5000, '24_7', true, false, 95),
  ('BTC/USDT OTC', 'Bitcoin / Tether OTC', 'otc', NULL, 63489.20, 5.2, 'high', 93, 1, 5000, '24_7', true, false, 96),
  ('ETH/USDT OTC', 'Ethereum / Tether OTC', 'otc', NULL, 3152.60, 0.95, 'high', 92, 1, 5000, '24_7', true, false, 97),
  ('SOL/USDT OTC', 'Solana / Tether OTC', 'otc', NULL, 171.28, 0.11, 'extreme', 93, 1, 5000, '24_7', true, false, 98),
  ('NAS100 OTC', 'Nasdaq 100 OTC', 'otc', NULL, 18240.40, 2.2, 'high', 91, 1, 5000, '24_7', true, false, 99),
  ('US30 OTC', 'Dow Jones 30 OTC', 'otc', NULL, 38670.10, 2.8, 'medium', 90, 1, 5000, '24_7', true, false, 100)
ON CONFLICT (symbol) DO NOTHING;