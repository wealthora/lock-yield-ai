CREATE OR REPLACE FUNCTION public.process_profile_change_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE profiles
    SET 
      first_name = COALESCE((NEW.requested_changes->>'first_name')::text, first_name),
      other_names = COALESCE((NEW.requested_changes->>'other_names')::text, other_names),
      phone = COALESCE((NEW.requested_changes->>'phone')::text, phone),
      country = COALESCE((NEW.requested_changes->>'country')::text, country),
      date_of_birth = COALESCE((NEW.requested_changes->>'date_of_birth')::date, date_of_birth),
      avatar = COALESCE((NEW.requested_changes->>'avatar')::text, avatar),
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
    INSERT INTO activities (user_id, activity_type, description)
    VALUES (NEW.user_id, 'profile_update', 'Profile information updated via admin approval');
  END IF;
  
  RETURN NEW;
END;
$function$;