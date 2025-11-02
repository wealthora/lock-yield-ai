-- Create function to increment returns balance
CREATE OR REPLACE FUNCTION public.increment_returns_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.balances
  SET 
    returns_balance = returns_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.balances (user_id, returns_balance)
    VALUES (p_user_id, p_amount);
  END IF;
END;
$$;

-- Create function to credit expired investment
CREATE OR REPLACE FUNCTION public.credit_expired_investment(
  p_user_id UUID,
  p_locked_amount NUMERIC,
  p_returns_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.balances
  SET 
    available_balance = available_balance + p_locked_amount + p_returns_amount,
    locked_balance = locked_balance - p_locked_amount,
    returns_balance = returns_balance - p_returns_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;