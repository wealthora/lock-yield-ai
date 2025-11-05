-- Add missing foreign key relationship between profile_change_requests and profiles
-- This allows the admin panel to properly join user profile data

ALTER TABLE IF EXISTS profile_change_requests
ADD CONSTRAINT profile_change_requests_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;