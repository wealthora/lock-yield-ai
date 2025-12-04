-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create referral_rewards table
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  deposit_amount NUMERIC NOT NULL,
  reward_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (true);

-- RLS policies for referral_rewards
CREATE POLICY "Users can view their own referral rewards"
ON public.referral_rewards FOR SELECT
USING (auth.uid() = referrer_id);

-- Function to process referral bonus on first approved deposit
CREATE OR REPLACE FUNCTION public.process_referral_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_bonus_amount NUMERIC;
  v_existing_reward UUID;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Check if this user was referred
    SELECT referrer_id INTO v_referrer_id
    FROM public.referrals
    WHERE referred_id = NEW.user_id;
    
    -- If user was referred and hasn't triggered a reward yet
    IF v_referrer_id IS NOT NULL THEN
      SELECT id INTO v_existing_reward
      FROM public.referral_rewards
      WHERE referred_id = NEW.user_id;
      
      -- Only give bonus on first deposit (no existing reward)
      IF v_existing_reward IS NULL THEN
        -- Calculate 10% bonus
        v_bonus_amount := NEW.amount * 0.10;
        
        -- Insert reward record
        INSERT INTO public.referral_rewards (referrer_id, referred_id, deposit_amount, reward_amount)
        VALUES (v_referrer_id, NEW.user_id, NEW.amount, v_bonus_amount);
        
        -- Add bonus to referrer's wallet
        UPDATE public.wallets
        SET available_balance = available_balance + v_bonus_amount
        WHERE user_id = v_referrer_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on deposit_requests
CREATE TRIGGER on_deposit_approved_referral_bonus
AFTER UPDATE ON public.deposit_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_bonus();