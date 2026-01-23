-- Remove all existing user-level KYC document policies
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

-- Create admin-only policies for KYC documents
-- Policy: Only admins can SELECT/view KYC documents
CREATE POLICY "Admins can view KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Policy: Admins can delete KYC documents if needed
CREATE POLICY "Admins can delete KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);