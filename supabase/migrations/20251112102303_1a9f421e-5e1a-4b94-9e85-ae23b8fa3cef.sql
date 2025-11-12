-- Update the handle_new_user trigger to properly handle all user metadata fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    first_name,
    other_names,
    email,
    phone,
    country,
    date_of_birth
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'other_names',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    (NEW.raw_user_meta_data->>'date_of_birth')::date
  );
  RETURN NEW;
END;
$$;