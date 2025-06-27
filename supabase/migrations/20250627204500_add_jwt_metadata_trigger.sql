
-- Create a trigger function to update JWT app_metadata when users are created or updated
CREATE OR REPLACE FUNCTION public.update_user_jwt_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the auth.users table with app_metadata
  IF NEW.auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', NEW.role,
        'agency_id', NEW.agency_id::text
      )
    WHERE id = NEW.auth_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS update_jwt_metadata_trigger ON public.users;
CREATE TRIGGER update_jwt_metadata_trigger
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_jwt_metadata();

-- Update existing users' JWT metadata
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, auth_user_id, role, agency_id 
    FROM public.users 
    WHERE auth_user_id IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', user_record.role,
        'agency_id', user_record.agency_id::text
      )
    WHERE id = user_record.auth_user_id;
  END LOOP;
END $$;
