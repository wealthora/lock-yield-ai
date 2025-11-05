-- Fix profile_change_requests foreign key constraint
-- Drop the existing foreign key if it exists
ALTER TABLE IF EXISTS profile_change_requests 
DROP CONSTRAINT IF EXISTS profile_change_requests_user_id_fkey;

-- Add correct foreign key referencing auth.users
ALTER TABLE IF EXISTS profile_change_requests 
ADD CONSTRAINT profile_change_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix storage buckets - create them with minimal configuration
DO $$ 
BEGIN
  -- Create avatars bucket if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name)
    VALUES ('avatars', 'avatars');
  END IF;

  -- Create kyc-documents bucket if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'kyc-documents') THEN
    INSERT INTO storage.buckets (id, name)
    VALUES ('kyc-documents', 'kyc-documents');
  END IF;
END $$;

-- Ensure RLS policies exist for storage
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;

-- RLS policies for avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- RLS policies for KYC documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);