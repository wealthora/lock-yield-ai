CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first_name text;
  v_other_names text;
  v_full_name text;
BEGIN
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_other_names := NEW.raw_user_meta_data->>'other_names';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');

  -- OAuth (Google) fallbacks
  IF v_first_name IS NULL THEN
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'given_name', split_part(v_full_name, ' ', 1));
  END IF;
  IF v_other_names IS NULL THEN
    v_other_names := COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      NULLIF(regexp_replace(COALESCE(v_full_name, ''), '^\S+\s*', ''), '')
    );
  END IF;

  INSERT INTO public.profiles (
    user_id,
    first_name,
    other_names,
    email,
    phone,
    country,
    date_of_birth,
    avatar
  )
  VALUES (
    NEW.id,
    v_first_name,
    v_other_names,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$function$;