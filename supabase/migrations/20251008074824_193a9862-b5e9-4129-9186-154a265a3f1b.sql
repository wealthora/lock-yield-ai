-- Create AI bots table
CREATE TABLE public.ai_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  daily_return_rate DECIMAL(5,2) NOT NULL, -- e.g., 1.5 for 1.5%
  minimum_investment DECIMAL(15,2) NOT NULL DEFAULT 0,
  risk_level TEXT,
  strategy TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_bots ENABLE ROW LEVEL SECURITY;

-- Everyone can view active bots
CREATE POLICY "Anyone can view active bots" 
ON public.ai_bots 
FOR SELECT 
USING (is_active = true);

-- Only admins can manage bots
CREATE POLICY "Admins can manage bots" 
ON public.ai_bots 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create bot investments table
CREATE TABLE public.bot_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_bots(id) ON DELETE CASCADE,
  initial_amount DECIMAL(15,2) NOT NULL,
  locked_amount DECIMAL(15,2) NOT NULL,
  accumulated_returns DECIMAL(15,2) DEFAULT 0,
  daily_return_rate DECIMAL(5,2) NOT NULL, -- Snapshot of bot rate at time of investment
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_investments ENABLE ROW LEVEL SECURITY;

-- Users can view their own investments
CREATE POLICY "Users can view their own investments" 
ON public.bot_investments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own investments
CREATE POLICY "Users can create their own investments" 
ON public.bot_investments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all investments
CREATE POLICY "Admins can view all investments" 
ON public.bot_investments 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_ai_bots_updated_at
BEFORE UPDATE ON public.ai_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_investments_updated_at
BEFORE UPDATE ON public.bot_investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default bots
INSERT INTO public.ai_bots (name, description, daily_return_rate, minimum_investment, risk_level, strategy) VALUES
('Bot Alpha', 'Conservative trading strategy with steady returns', 1.5, 50, 'Low', 'Trend Following'),
('Bot Titan', 'Balanced approach with moderate risk and returns', 2.5, 150, 'Medium', 'Mean Reversion'),
('Bot Quantum', 'Aggressive trading for maximum returns', 3.5, 500, 'High', 'Scalping & Arbitrage');

-- Enable realtime for bot investments
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_investments;