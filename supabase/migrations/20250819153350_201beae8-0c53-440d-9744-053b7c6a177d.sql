-- Lock down users and agencies tables (fixed policy syntax)
BEGIN;

-- Ensure all RLS helper functions exist
CREATE OR REPLACE FUNCTION public.rls_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text;
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'agency_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.id FROM public.users u 
  WHERE u.auth_user_id = auth.uid() LIMIT 1;
$$;

-- 1) users table lockdown
REVOKE ALL ON public.users FROM PUBLIC;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Public can read user names for referral context" ON public.users;
DROP POLICY IF EXISTS "Users and superadmins can read users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users via JWT" ON public.users;
DROP POLICY IF EXISTS "Agency admin can manage agency agents via JWT" ON public.users;
DROP POLICY IF EXISTS "JWT based admin access" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Superadmin can manage all agents via JWT" ON public.users;
DROP POLICY IF EXISTS "Superadmin can view all users via JWT" ON public.users;
DROP POLICY IF EXISTS "users_select_scoped" ON public.users;
DROP POLICY IF EXISTS "users_update_superadmin" ON public.users;
DROP POLICY IF EXISTS "users_delete_superadmin" ON public.users;

-- Secure SELECT policy: superadmin all; agency_admin only agency; agent self only
CREATE POLICY "users_select_secure" ON public.users
FOR SELECT TO authenticated
USING (
  public.rls_auth_role() = 'superadmin'
  OR (public.rls_auth_role() = 'agency_admin' AND agency_id = public.rls_auth_agency_id())
  OR (public.rls_auth_role() = 'agent' AND id = public.rls_auth_user_id())
);

-- Separate policies for INSERT/UPDATE/DELETE
CREATE POLICY "users_insert_superadmin" ON public.users
FOR INSERT TO authenticated
WITH CHECK (public.rls_auth_role() = 'superadmin');

CREATE POLICY "users_update_superadmin" ON public.users
FOR UPDATE TO authenticated
USING (public.rls_auth_role() = 'superadmin')
WITH CHECK (public.rls_auth_role() = 'superadmin');

CREATE POLICY "users_delete_superadmin" ON public.users
FOR DELETE TO authenticated
USING (public.rls_auth_role() = 'superadmin');

-- 2) agencies table lockdown  
REVOKE ALL ON public.agencies FROM PUBLIC;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies FORCE ROW LEVEL SECURITY;

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Admins can manage agencies based on JWT role" ON public.agencies;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.agencies;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agencies;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.agencies;
DROP POLICY IF EXISTS "Public can read agency names for referral context" ON public.agencies;
DROP POLICY IF EXISTS "agencies_select_scoped" ON public.agencies;

-- Secure SELECT policy: superadmin all; staff only own agency
CREATE POLICY "agencies_select_secure" ON public.agencies
FOR SELECT TO authenticated
USING (
  public.rls_auth_role() = 'superadmin'
  OR (
    public.rls_auth_role() IN ('agency_admin','agent')
    AND id = public.rls_auth_agency_id()
  )
);

-- Separate modify policies
CREATE POLICY "agencies_insert_superadmin" ON public.agencies
FOR INSERT TO authenticated
WITH CHECK (public.rls_auth_role() = 'superadmin');

CREATE POLICY "agencies_update_superadmin" ON public.agencies
FOR UPDATE TO authenticated
USING (public.rls_auth_role() = 'superadmin')
WITH CHECK (public.rls_auth_role() = 'superadmin');

CREATE POLICY "agencies_delete_superadmin" ON public.agencies
FOR DELETE TO authenticated
USING (public.rls_auth_role() = 'superadmin');

-- 3) Fix SECURITY DEFINER view issue - drop it and create normal view
DROP VIEW IF EXISTS public.clients_agent_view;

-- Create normal view (not SECURITY DEFINER) - RLS applies to base table
CREATE VIEW public.clients_agent_view AS
SELECT c.id, c.full_name, c.created_at, c.updated_at
FROM public.clients c;

COMMENT ON VIEW public.clients_agent_view IS 'Agent-safe client view without PII (no phone/email). Access controlled by RLS on clients table.';

-- Grant access to the view
GRANT SELECT ON public.clients_agent_view TO authenticated;

COMMIT;