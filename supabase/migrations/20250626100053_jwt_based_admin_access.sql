-- First, drop ALL existing policies on the users table to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their agency" ON public.users;
DROP POLICY IF EXISTS "Agency admins can update users in their agency" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users based on JWT role" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

-- Create fresh, non-recursive policies using JWT metadata
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "JWT based admin access" ON public.users
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid = agency_id)
  ) WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid = agency_id)
  );

-- Allow service role (edge functions) to manage all users
CREATE POLICY "Service role full access" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
