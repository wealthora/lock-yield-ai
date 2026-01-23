-- Add new KYC columns for proof of identity and residence
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS proof_of_identity_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_residence_url TEXT,
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.proof_of_identity_url IS 'URL to uploaded ID card or driving license (image only)';
COMMENT ON COLUMN public.profiles.proof_of_residence_url IS 'URL to uploaded utility bill or address proof (image/PDF/DOCX)';
COMMENT ON COLUMN public.profiles.kyc_rejection_reason IS 'Mandatory reason when admin rejects KYC';