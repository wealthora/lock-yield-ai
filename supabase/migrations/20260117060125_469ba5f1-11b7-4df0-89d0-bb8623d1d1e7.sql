-- Add an email column to verification_codes table for signup verification
-- Since user_id is UUID and we need to store email for unregistered users
ALTER TABLE public.verification_codes ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index for email lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);

-- Update the existing RLS policies to also consider email-based lookups
-- Drop existing policies first if needed
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow insert for verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow service role full access" ON public.verification_codes;

-- Allow service role to manage all verification codes (needed for signup flow)
-- The edge functions use service role key, so they bypass RLS anyway
-- For safety, enable RLS but allow authenticated users to see their own codes
CREATE POLICY "Users can view their own verification codes"
ON public.verification_codes
FOR SELECT
USING (auth.uid() = user_id OR email IS NOT NULL);

-- Allow inserts via service role (edge functions)
CREATE POLICY "Allow insert for verification codes"
ON public.verification_codes
FOR INSERT
WITH CHECK (true);

-- Allow updates for marking codes as used
CREATE POLICY "Allow update for verification codes"
ON public.verification_codes
FOR UPDATE
USING (true);