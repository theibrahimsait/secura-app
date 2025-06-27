
-- First, drop ALL existing policies on the users table to start completely fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users via JWT" ON public.users;
DROP POLICY IF EXISTS "Superadmin can view all users via JWT" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency agents via table lookup" ON public.users;
DROP POLICY IF EXISTS "Agency admin can manage agency agents via JWT" ON public.users;
DROP POLICY IF EXISTS "Superadmin can manage all agents via JWT" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users based on JWT role" ON public.users;

-- Now create the essential policies for login to work
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Allow service role full access (needed for edge functions)
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Simple JWT-based policies for admins (non-recursive)
CREATE POLICY "Agency admin can view agency users via JWT" ON public.users
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND 
    (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid = agency_id
  );

CREATE POLICY "Superadmin can view all users via JWT" ON public.users
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin')
  );
