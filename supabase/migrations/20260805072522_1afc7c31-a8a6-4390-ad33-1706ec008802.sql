-- ASSETS
CREATE TABLE public.binary_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  tv_symbol text,
  base_price numeric NOT NULL DEFAULT 100,
  spread numeric NOT NULL DEFAULT 0.0002,
  volatility_level text NOT NULL DEFAULT 'medium',
  payout_percent numeric NOT NULL DEFAULT 85,
  min_trade numeric NOT NULL DEFAULT 1,
  max_trade numeric NOT NULL DEFAULT 1000,
  market_hours text NOT NULL DEFAULT '24_7',
  is_active boolean NOT NULL DEFAULT true,
  is_suspended boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.binary_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binary_assets TO authenticated;
GRANT ALL ON public.binary_assets TO service_role;
ALTER TABLE public.binary_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view binary assets" ON public.binary_assets FOR SELECT USING (true);
CREATE POLICY "Admins can insert binary assets" ON public.binary_assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update binary assets" ON public.binary_assets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete binary assets" ON public.binary_assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_binary_assets_updated_at BEFORE UPDATE ON public.binary_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TRADES
CREATE TABLE public.binary_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid REFERENCES public.binary_assets(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  category text NOT NULL DEFAULT 'forex',
  direction text NOT NULL,
  stake numeric NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric,
  payout_percent numeric NOT NULL,
  potential_payout numeric NOT NULL,
  profit_loss numeric,
  expiry_seconds integer NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  settled_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_binary_trades_user ON public.binary_trades(user_id, created_at DESC);
CREATE INDEX idx_binary_trades_status ON public.binary_trades(status, expires_at);
GRANT SELECT ON public.binary_trades TO authenticated;
GRANT ALL ON public.binary_trades TO service_role;
ALTER TABLE public.binary_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own binary trades" ON public.binary_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all binary trades" ON public.binary_trades FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_binary_trades_updated_at BEFORE UPDATE ON public.binary_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FAVORITES
CREATE TABLE public.binary_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, DELETE ON public.binary_favorites TO authenticated;
GRANT ALL ON public.binary_favorites TO service_role;
ALTER TABLE public.binary_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own binary favorites" ON public.binary_favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SETTINGS
CREATE TABLE public.binary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_enabled boolean NOT NULL DEFAULT true,
  global_min_trade numeric NOT NULL DEFAULT 1,
  global_max_trade numeric NOT NULL DEFAULT 5000,
  max_open_trades integer NOT NULL DEFAULT 20,
  max_user_exposure numeric NOT NULL DEFAULT 10000,
  max_platform_exposure numeric NOT NULL DEFAULT 500000,
  expiry_options jsonb NOT NULL DEFAULT '[5,10,15,30,60,120,180,300,600,900,1800,3600]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.binary_settings TO anon;
GRANT SELECT, UPDATE ON public.binary_settings TO authenticated;
GRANT ALL ON public.binary_settings TO service_role;
ALTER TABLE public.binary_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view binary settings" ON public.binary_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update binary settings" ON public.binary_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_binary_settings_updated_at BEFORE UPDATE ON public.binary_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.binary_settings (id) VALUES (gen_random_uuid());

-- SEED ASSETS
INSERT INTO public.binary_assets (symbol,name,category,tv_symbol,base_price,spread,volatility_level,payout_percent,min_trade,max_trade,market_hours,sort_order) VALUES
('EUR/USD','Euro / US Dollar','forex','FX:EURUSD',1.0854,0.00012,'low',85,1,1000,'forex',1),
('GBP/USD','British Pound / US Dollar','forex','FX:GBPUSD',1.2712,0.00016,'low',85,1,1000,'forex',2),
('USD/JPY','US Dollar / Japanese Yen','forex','FX:USDJPY',151.42,0.014,'low',85,1,1000,'forex',3),
('USD/CHF','US Dollar / Swiss Franc','forex','FX:USDCHF',0.9042,0.00018,'low',84,1,1000,'forex',4),
('USD/CAD','US Dollar / Canadian Dollar','forex','FX:USDCAD',1.3624,0.00019,'low',84,1,1000,'forex',5),
('AUD/USD','Australian Dollar / US Dollar','forex','FX:AUDUSD',0.6588,0.00017,'medium',84,1,1000,'forex',6),
('NZD/USD','New Zealand Dollar / US Dollar','forex','FX:NZDUSD',0.6042,0.00021,'medium',83,1,1000,'forex',7),
('EUR/GBP','Euro / British Pound','forex','FX:EURGBP',0.8538,0.00019,'low',83,1,1000,'forex',8),
('EUR/JPY','Euro / Japanese Yen','forex','FX:EURJPY',164.28,0.018,'medium',84,1,1000,'forex',9),
('GBP/JPY','British Pound / Japanese Yen','forex','FX:GBPJPY',192.44,0.026,'high',85,1,1000,'forex',10),
('EUR/CHF','Euro / Swiss Franc','forex','FX:EURCHF',0.9812,0.00021,'low',82,1,1000,'forex',11),
('AUD/JPY','Australian Dollar / Japanese Yen','forex','FX:AUDJPY',99.76,0.021,'medium',84,1,1000,'forex',12),
('BTC/USDT','Bitcoin / Tether','crypto','BINANCE:BTCUSDT',67421.50,4.5,'high',88,1,2000,'24_7',20),
('ETH/USDT','Ethereum / Tether','crypto','BINANCE:ETHUSDT',3284.20,0.85,'high',88,1,2000,'24_7',21),
('SOL/USDT','Solana / Tether','crypto','BINANCE:SOLUSDT',172.35,0.09,'high',87,1,2000,'24_7',22),
('XRP/USDT','Ripple / Tether','crypto','BINANCE:XRPUSDT',0.5842,0.0004,'high',86,1,2000,'24_7',23),
('BNB/USDT','BNB / Tether','crypto','BINANCE:BNBUSDT',592.80,0.35,'medium',86,1,2000,'24_7',24),
('DOGE/USDT','Dogecoin / Tether','crypto','BINANCE:DOGEUSDT',0.1428,0.0002,'high',86,1,2000,'24_7',25),
('ADA/USDT','Cardano / Tether','crypto','BINANCE:ADAUSDT',0.4512,0.0003,'high',85,1,2000,'24_7',26),
('LINK/USDT','Chainlink / Tether','crypto','BINANCE:LINKUSDT',14.82,0.012,'high',85,1,2000,'24_7',27),
('Volatility 10 Index','Volatility 10 Index','synthetic',NULL,6412.30,0.32,'low',87,1,1500,'24_7',40),
('Volatility 25 Index','Volatility 25 Index','synthetic',NULL,3184.75,0.48,'low',87,1,1500,'24_7',41),
('Volatility 50 Index','Volatility 50 Index','synthetic',NULL,248.62,0.09,'medium',88,1,1500,'24_7',42),
('Volatility 75 Index','Volatility 75 Index','synthetic',NULL,98421.40,12.5,'high',89,1,1500,'24_7',43),
('Volatility 100 Index','Volatility 100 Index','synthetic',NULL,1284.55,0.75,'high',90,1,1500,'24_7',44),
('Volatility 150 Index','Volatility 150 Index','synthetic',NULL,2412.80,1.85,'extreme',91,1,1500,'24_7',45),
('Volatility 200 Index','Volatility 200 Index','synthetic',NULL,4128.90,3.2,'extreme',92,1,1500,'24_7',46),
('Jump 10 Index','Jump 10 Index','synthetic',NULL,9482.15,0.85,'low',87,1,1500,'24_7',47),
('Jump 25 Index','Jump 25 Index','synthetic',NULL,4218.60,0.95,'medium',88,1,1500,'24_7',48),
('Jump 50 Index','Jump 50 Index','synthetic',NULL,12842.30,2.1,'medium',88,1,1500,'24_7',49),
('Jump 75 Index','Jump 75 Index','synthetic',NULL,8421.75,2.8,'high',89,1,1500,'24_7',50),
('Jump 100 Index','Jump 100 Index','synthetic',NULL,15284.40,4.2,'high',90,1,1500,'24_7',51),
('Crash 300','Crash 300 Index','synthetic',NULL,8241.55,1.6,'high',89,1,1500,'24_7',52),
('Crash 500','Crash 500 Index','synthetic',NULL,6128.40,1.4,'high',89,1,1500,'24_7',53),
('Crash 1000','Crash 1000 Index','synthetic',NULL,9842.20,1.9,'extreme',90,1,1500,'24_7',54),
('Boom 300','Boom 300 Index','synthetic',NULL,7412.85,1.5,'high',89,1,1500,'24_7',55),
('Boom 500','Boom 500 Index','synthetic',NULL,5284.60,1.3,'high',89,1,1500,'24_7',56),
('Boom 1000','Boom 1000 Index','synthetic',NULL,10248.75,2.0,'extreme',90,1,1500,'24_7',57),
('Step Index','Step Index','synthetic',NULL,8942.10,0.10,'low',86,1,1500,'24_7',58),
('Range Break 100','Range Break 100 Index','synthetic',NULL,4821.35,1.1,'medium',88,1,1500,'24_7',59),
('Range Break 200','Range Break 200 Index','synthetic',NULL,6284.90,1.7,'high',89,1,1500,'24_7',60);