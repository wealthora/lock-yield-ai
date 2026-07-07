
ALTER TABLE public.ai_bots
  ADD COLUMN IF NOT EXISTS minimum_lockup_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.bot_investments
  ADD COLUMN IF NOT EXISTS auto_reinvest boolean NOT NULL DEFAULT false;
