
-- First, drop ALL existing policies on the users table to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Superadmin can view all users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users" ON public.users;
DROP POLICY IF EXISTS "Superadmin can create any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can create users for their agency" ON public.users;
DROP POLICY IF EXISTS "Superadmin can update any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can update agency users" ON public.users;
DROP POLICY IF EXISTS "Superadmin can delete any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can delete agency users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users based on JWT role" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users via JWT" ON public.users;
DROP POLICY IF EXISTS "Superadmin can view all users via JWT" ON public.users;

-- Now create the clean policy structure
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Allow service role (edge functions) full access for user creation
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow agency admins to view users in their agency using JWT metadata
CREATE POLICY "Agency admin can view agency users via JWT" ON public.users
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND 
    (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid = agency_id
  );

-- Allow superadmins to view all users using JWT metadata
CREATE POLICY "Superadmin can view all users via JWT" ON public.users
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin')
  );
