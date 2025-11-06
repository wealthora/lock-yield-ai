-- Add first_name and other_names columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN other_names TEXT;

-- Migrate existing name data to first_name (take first word as first name)
UPDATE public.profiles
SET first_name = SPLIT_PART(name, ' ', 1),
    other_names = TRIM(SUBSTRING(name FROM LENGTH(SPLIT_PART(name, ' ', 1)) + 1))
WHERE name IS NOT NULL;

-- Drop the old name column
ALTER TABLE public.profiles DROP COLUMN name;

-- Update handle_new_user function to use first_name and other_names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, other_names, phone, country, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'other_names',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    (NEW.raw_user_meta_data->>'date_of_birth')::DATE
  );
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;