-- Add profile fields for user details
ALTER TABLE public.profiles
ADD COLUMN phone TEXT,
ADD COLUMN country TEXT,
ADD COLUMN date_of_birth DATE,
ADD COLUMN avatar TEXT;