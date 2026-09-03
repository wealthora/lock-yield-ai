CREATE TABLE public.market_anchors (
  symbol TEXT PRIMARY KEY,
  provider_symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  anchor_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.market_anchors TO anon;
GRANT SELECT ON public.market_anchors TO authenticated;
GRANT ALL ON public.market_anchors TO service_role;

ALTER TABLE public.market_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market prices are publicly readable"
  ON public.market_anchors FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.market_feed_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_call_at TIMESTAMPTZ,
  minute_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  minute_credits INTEGER NOT NULL DEFAULT 0,
  day_start DATE NOT NULL DEFAULT CURRENT_DATE,
  day_credits INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.market_feed_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT ALL ON public.market_feed_state TO service_role;

ALTER TABLE public.market_feed_state ENABLE ROW LEVEL SECURITY;