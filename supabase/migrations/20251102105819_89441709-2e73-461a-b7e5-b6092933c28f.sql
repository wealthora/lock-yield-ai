-- Rename balances table to wallets
ALTER TABLE public.balances RENAME TO wallets;

-- Create transactions table for all financial activities
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bot_allocation', 'bot_return_credit')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bot_id UUID REFERENCES public.ai_bots(id) ON DELETE SET NULL,
  allocation_id UUID,
  notes TEXT,
  method TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin policies for transactions using user_roles table
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all transactions"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create trigger for updating transactions updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add transactions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Migrate existing withdrawal_requests to transactions with status mapping
INSERT INTO public.transactions (user_id, type, amount, status, method, wallet_address, notes, created_at)
SELECT 
  user_id,
  'withdrawal',
  amount,
  CASE 
    WHEN status = 'declined' THEN 'rejected'
    ELSE status
  END,
  method,
  wallet_address,
  admin_notes,
  created_at
FROM public.withdrawal_requests
ON CONFLICT DO NOTHING;

-- Create function to process transaction approval
CREATE OR REPLACE FUNCTION process_transaction_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.processed_at = now();
    
    -- Handle withdrawal approval - deduct from available_balance
    IF NEW.type = 'withdrawal' THEN
      UPDATE public.wallets
      SET available_balance = available_balance - NEW.amount
      WHERE user_id = NEW.user_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transaction approval
CREATE TRIGGER on_transaction_approval
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION process_transaction_approval();