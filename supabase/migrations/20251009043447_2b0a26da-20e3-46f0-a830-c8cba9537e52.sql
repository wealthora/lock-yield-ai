-- Add columns to deposit_requests table
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

-- Create profile_change_requests table
CREATE TABLE IF NOT EXISTS profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profile_change_requests
ALTER TABLE profile_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_change_requests
CREATE POLICY "Users can view their own profile change requests"
ON profile_change_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile change requests"
ON profile_change_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profile change requests"
ON profile_change_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profile change requests"
ON profile_change_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_user_id ON profile_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status ON profile_change_requests(status);

-- Update trigger for profile_change_requests
CREATE OR REPLACE FUNCTION update_profile_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_change_requests_updated_at
BEFORE UPDATE ON profile_change_requests
FOR EACH ROW
EXECUTE FUNCTION update_profile_change_requests_updated_at();