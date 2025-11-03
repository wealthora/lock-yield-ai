-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, owner)
VALUES ('avatars', 'avatars', NULL)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket - Allow public read access
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to automatically update profile when request is approved
CREATE OR REPLACE FUNCTION process_profile_change_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update the user's profile with requested changes
    UPDATE profiles
    SET 
      name = COALESCE((NEW.requested_changes->>'name')::text, name),
      phone = COALESCE((NEW.requested_changes->>'phone')::text, phone),
      country = COALESCE((NEW.requested_changes->>'country')::text, country),
      date_of_birth = COALESCE((NEW.requested_changes->>'date_of_birth')::date, date_of_birth),
      avatar = COALESCE((NEW.requested_changes->>'avatar')::text, avatar),
      updated_at = now()
    WHERE id = NEW.user_id;
    
    -- Log the activity
    INSERT INTO activities (user_id, activity_type, description)
    VALUES (NEW.user_id, 'profile_update', 'Profile information updated via admin approval');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic profile updates
DROP TRIGGER IF EXISTS auto_process_profile_approval ON profile_change_requests;
CREATE TRIGGER auto_process_profile_approval
  AFTER UPDATE ON profile_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_profile_change_approval();

-- Enable realtime for profile_change_requests (if not already enabled)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profile_change_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for profiles (if not already enabled)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;