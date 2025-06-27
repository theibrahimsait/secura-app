-- Add a policy to allow agency admins to view and manage agents in their agency using JWT metadata
DROP POLICY IF EXISTS "Agency admin can manage agency agents via JWT" ON public.users;
CREATE POLICY "Agency admin can manage agency agents via JWT" ON public.users
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND 
    (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid = agency_id AND
    role = 'agent'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND 
    (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid = agency_id AND
    role = 'agent'
  );

-- Also add a policy for superadmins to manage agents using JWT metadata
DROP POLICY IF EXISTS "Superadmin can manage all agents via JWT" ON public.users;
CREATE POLICY "Superadmin can manage all agents via JWT" ON public.users
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin') AND
    role = 'agent'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin')
  );
