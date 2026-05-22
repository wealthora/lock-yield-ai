UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- Ensure public read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatars are publicly accessible'
  ) THEN
    CREATE POLICY "Avatars are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END $$;