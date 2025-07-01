-- Step 1: Create a function to propagate user data to auth.users' metadata
CREATE OR REPLACE FUNCTION public.on_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- IMPORTANT: Set the search path to prevent hijacking
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists in auth.users before trying to update
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.auth_user_id) THEN
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || 
      jsonb_build_object(
        'role', NEW.role,
        'agency_id', NEW.agency_id
      )
    WHERE id = NEW.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Create a trigger to call the function when a user is inserted or their role/agency changes
CREATE OR REPLACE TRIGGER on_user_updated_trigger
AFTER INSERT OR UPDATE OF role, agency_id ON public.users
FOR EACH ROW EXECUTE FUNCTION public.on_user_updated();

-- Step 3: Run a one-time backfill to update metadata for all existing users
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || 
  jsonb_build_object(
    'role', u.role,
    'agency_id', u.agency_id
  )
FROM public.users u
WHERE u.auth_user_id = auth.users.id;

-- Step 4: Drop all old, recursive policies on public.users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users based on JWT role" ON public.users;
DROP POLICY IF EXISTS "Superadmin can view all users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view users in their agency" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users based on role" ON public.users;
DROP POLICY IF EXISTS "Superadmin can create any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can create users for their agency" ON public.users;
DROP POLICY IF EXISTS "Superadmin can update any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can update agency users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can update users in their agency" ON public.users;
DROP POLICY IF EXISTS "Superadmin can delete any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can delete agency users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can delete users in their agency" ON public.users;
DROP POLICY IF EXISTS "Enable insert for superadmin" ON public.users;
DROP POLICY IF EXISTS "Enable update for own record or superadmin" ON public.users;


-- Step 5: Create new, non-recursive policies on public.users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());
  
DROP POLICY IF EXISTS "Admins can manage users based on JWT role" ON public.users;
CREATE POLICY "Admins can manage users based on JWT role" ON public.users
  FOR ALL USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'superadmin' OR
    (((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'agency_admin') AND ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'agency_id')::uuid = agency_id)
  ) WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'superadmin' OR
    (((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'agency_admin') AND ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'agency_id')::uuid = agency_id)
  );

-- Step 6: Drop all old, recursive policies on public.agencies
DROP POLICY IF EXISTS "Superadmin can view all agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agency admin can view own agency" ON public.agencies;
DROP POLICY IF EXISTS "Users can view their own agency" ON public.agencies;
DROP POLICY IF EXISTS "Superadmin can create agencies" ON public.agencies;
DROP POLICY IF EXISTS "Superadmin can update agencies" ON public.agencies;
DROP POLICY IF EXISTS "Superadmin can delete agencies" ON public.agencies;

-- Step 7: Create new, non-recursive policies on public.agencies
DROP POLICY IF EXISTS "Admins can manage agencies based on JWT role" ON public.agencies;
CREATE POLICY "Admins can manage agencies based on JWT role" ON public.agencies
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid)
  ) WITH CHECK (
    (auth.jwt() -> 'app_data' ->> 'role' = 'superadmin')
  );
  
-- Step 8: Drop the old, recursive helper functions
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.get_my_agency_id(); 