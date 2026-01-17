-- Drop the foreign key constraint on user_id to allow NULL values for signup verification
ALTER TABLE public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_user_id_fkey;

-- Make user_id nullable
ALTER TABLE public.verification_codes ALTER COLUMN user_id DROP NOT NULL;