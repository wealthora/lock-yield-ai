-- Add returns_balance column to balances table
ALTER TABLE public.balances 
ADD COLUMN IF NOT EXISTS returns_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- Add completed_at column to bot_investments table
ALTER TABLE public.bot_investments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add allocation_id column to bot_returns for reference
ALTER TABLE public.bot_returns
ADD COLUMN IF NOT EXISTS allocation_id UUID REFERENCES public.bot_investments(id) ON DELETE CASCADE;

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create index for faster queries on active investments
CREATE INDEX IF NOT EXISTS idx_bot_investments_status_end_date 
ON public.bot_investments(status, end_date) 
WHERE status = 'active';

-- Enable realtime for balances table (check if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'balances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.balances;
  END IF;
END $$;

-- Enable realtime for bot_returns table (check if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'bot_returns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_returns;
  END IF;
END $$;