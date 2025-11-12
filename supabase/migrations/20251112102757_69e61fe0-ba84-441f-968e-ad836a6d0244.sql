-- Create a trigger to automatically create a wallet when a profile is created
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create wallet for the new user
  INSERT INTO public.wallets (
    user_id,
    available_balance,
    locked_balance,
    returns_balance
  )
  VALUES (
    NEW.user_id,
    0,
    0,
    0
  );

  -- Log welcome activity
  INSERT INTO public.activities (
    user_id,
    activity_type,
    description,
    status
  )
  VALUES (
    NEW.user_id,
    'profile_update',
    'Welcome! Your account has been created successfully.',
    'completed'
  );

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS create_wallet_on_profile_creation ON public.profiles;

-- Create trigger that fires after a profile is created
CREATE TRIGGER create_wallet_on_profile_creation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_new_user();