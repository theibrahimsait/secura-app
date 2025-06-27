-- Fix JWT metadata synchronization issue
-- The problem is that the JWT metadata is not being properly updated with role and agency_id

-- Step 1: Drop and recreate the trigger function to ensure it works correctly
DROP TRIGGER IF EXISTS on_user_updated_trigger ON public.users;
DROP FUNCTION IF EXISTS public.on_user_updated();

CREATE OR REPLACE FUNCTION public.on_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists in auth.users before trying to update
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.auth_user_id) THEN
    -- Update the JWT metadata with role and agency_id
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', NEW.role,
        'agency_id', NEW.agency_id
      )
    WHERE id = NEW.auth_user_id;
    
    RAISE NOTICE 'Updated JWT metadata for user %: role=%, agency_id=%', NEW.auth_user_id, NEW.role, NEW.agency_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Recreate the trigger
CREATE TRIGGER on_user_updated_trigger
AFTER INSERT OR UPDATE OF role, agency_id, auth_user_id ON public.users
FOR EACH ROW EXECUTE FUNCTION public.on_user_updated();

-- Step 3: Run a backfill to update JWT metadata for all existing users
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', u.role,
    'agency_id', u.agency_id
  )
FROM public.users u
WHERE u.auth_user_id = auth.users.id
  AND u.auth_user_id IS NOT NULL;

-- Step 4: Add a policy to allow users to refresh their JWT metadata
CREATE OR REPLACE FUNCTION public.refresh_jwt_metadata()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role user_role;
  user_agency_id uuid;
  result jsonb;
BEGIN
  -- Get current user's role and agency_id
  SELECT role, agency_id INTO user_role, user_agency_id
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  IF user_role IS NOT NULL THEN
    -- Update JWT metadata
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', user_role,
        'agency_id', user_agency_id
      )
    WHERE id = auth.uid();
    
    -- Return the updated metadata
    SELECT raw_app_meta_data INTO result
    FROM auth.users
    WHERE id = auth.uid();
    
    RETURN result;
  END IF;
  
  RETURN '{}'::jsonb;
END;
$$;
