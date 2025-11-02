-- Create bot_returns table for tracking daily returns
CREATE TABLE IF NOT EXISTS public.bot_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_bots(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_return NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cumulative_return NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_returns ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own returns"
ON public.bot_returns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own returns"
ON public.bot_returns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_bot_returns_user_id ON public.bot_returns(user_id);
CREATE INDEX idx_bot_returns_date ON public.bot_returns(date DESC);
CREATE INDEX idx_bot_returns_user_date ON public.bot_returns(user_id, date DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bot_returns_updated_at
BEFORE UPDATE ON public.bot_returns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint to prevent duplicate entries for same user/bot/date
ALTER TABLE public.bot_returns 
ADD CONSTRAINT unique_user_bot_date UNIQUE (user_id, bot_id, date);