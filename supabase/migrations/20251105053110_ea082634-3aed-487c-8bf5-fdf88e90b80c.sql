-- Create user_security table for 2FA and security settings
CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_2fa_enabled BOOLEAN DEFAULT false,
  two_fa_method TEXT CHECK (two_fa_method IN ('email', 'sms', 'totp')) DEFAULT 'email',
  two_fa_secret TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- Users can view their own security settings
CREATE POLICY "Users can view own security settings"
ON public.user_security
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own security settings
CREATE POLICY "Users can update own security settings"
ON public.user_security
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own security settings
CREATE POLICY "Users can insert own security settings"
ON public.user_security
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_security_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_security_timestamp
BEFORE UPDATE ON public.user_security
FOR EACH ROW
EXECUTE FUNCTION update_user_security_updated_at();

-- Create verification_codes table for 2FA codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'withdrawal', 'settings')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- No direct access - only through edge functions
CREATE POLICY "No direct access to verification codes"
ON public.verification_codes
FOR ALL
TO authenticated
USING (false);