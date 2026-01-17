-- Drop the existing purpose check constraint
ALTER TABLE public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_purpose_check;

-- Add the updated check constraint that includes all used values
ALTER TABLE public.verification_codes 
ADD CONSTRAINT verification_codes_purpose_check 
CHECK (purpose IN ('2fa', 'password_reset', 'signup_verification', 'settings', 'withdrawal'));