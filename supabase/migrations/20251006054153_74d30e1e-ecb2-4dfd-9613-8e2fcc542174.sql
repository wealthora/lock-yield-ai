-- Create activities table to track all user actions
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'allocation', 'kyc_update'
  description TEXT NOT NULL,
  amount DECIMAL(15, 2),
  method TEXT, -- BTC, USDT, M-Pesa, etc.
  metadata JSONB, -- Store additional data like bot name, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own activities"
ON public.activities
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_activities_user_id_created_at ON public.activities(user_id, created_at DESC);

-- Enable realtime
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;