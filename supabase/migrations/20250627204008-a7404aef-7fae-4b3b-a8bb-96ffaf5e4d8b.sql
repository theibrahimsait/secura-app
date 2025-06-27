
-- Add policies to allow agency admins to manage agents in their agency
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

-- Also add a policy for superadmins to manage all agents
CREATE POLICY "Superadmin can manage all agents via JWT" ON public.users
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin') AND
    role = 'agent'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin')
  );
