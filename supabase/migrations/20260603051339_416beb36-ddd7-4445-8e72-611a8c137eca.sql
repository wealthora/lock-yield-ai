CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'crypto',
  network TEXT,
  icon TEXT,
  min_deposit NUMERIC NOT NULL DEFAULT 50,
  max_deposit NUMERIC NOT NULL DEFAULT 1000000,
  min_withdrawal NUMERIC NOT NULL DEFAULT 10,
  max_withdrawal NUMERIC NOT NULL DEFAULT 1000000,
  fee_percent NUMERIC NOT NULL DEFAULT 0,
  processing_time TEXT NOT NULL DEFAULT 'Instant',
  deposit_address TEXT,
  deposit_instructions TEXT,
  supports_deposit BOOLEAN NOT NULL DEFAULT true,
  supports_withdrawal BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods"
ON public.payment_methods FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment methods"
ON public.payment_methods FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment methods"
ON public.payment_methods FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_methods (name, code, category, network, icon, min_deposit, min_withdrawal, fee_percent, processing_time, sort_order) VALUES
('USDC TRC20', 'usdc_trc20', 'crypto', 'TRC20', '💵', 50, 10, 0, 'Instant', 1),
('USDC ERC20', 'usdc_erc20', 'crypto', 'ERC20', '💵', 50, 10, 0, 'Instant', 2),
('USDT TRC20', 'usdt_trc20', 'crypto', 'TRC20', '💎', 50, 10, 0, 'Instant', 3),
('USDT ERC20', 'usdt_erc20', 'crypto', 'ERC20', '💎', 50, 10, 0, 'Instant', 4),
('Ripple XRP', 'xrp', 'crypto', 'XRP', '✕', 50, 10, 0, 'Instant', 5),
('Tron', 'trx', 'crypto', 'TRC20', '🔺', 50, 10, 0, 'Instant', 6),
('Ethereum ETH', 'eth', 'crypto', 'ERC20', 'Ξ', 50, 10, 0, 'Instant', 7),
('Bitcoin BTC', 'btc', 'crypto', 'BTC', '₿', 50, 10, 0, 'Instant', 8);