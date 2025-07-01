-- Step 1: Drop the faulty policy on public.agencies
DROP POLICY IF EXISTS "Admins can manage agencies based on JWT role" ON public.agencies;

-- Step 2: Recreate the policy with the correct 'app_metadata' reference
CREATE POLICY "Admins can manage agencies based on JWT role" ON public.agencies
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') AND id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid)
  ) WITH CHECK (
    -- The WITH CHECK clause should only apply to superadmins creating agencies, as agency_admins shouldn't create them.
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin')
  );

-- Step 3: Add a simple SELECT policy for authenticated users to see their own agency (read-only)
CREATE POLICY "Users can view their own agency" ON public.agencies
  FOR SELECT USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
  ); 