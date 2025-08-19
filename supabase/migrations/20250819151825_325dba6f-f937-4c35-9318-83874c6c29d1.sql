-- RLS hardening and relationship-based access model (fixed policy syntax)
BEGIN;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.rls_auth_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text;
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_agency_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'agency_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_agent_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT u.id FROM public.users u 
  WHERE u.auth_user_id = auth.uid() AND u.role = 'agent'::user_role LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.rls_is_superadmin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (public.rls_auth_role() = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_client_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT public.get_client_id_from_session_readonly();
$$;

-- Predicate functions
CREATE OR REPLACE FUNCTION public.rls_can_read_client(p_client_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  my_role text := public.rls_auth_role();
  my_agency uuid := public.rls_auth_agency_id();
  my_agent uuid := public.rls_auth_agent_id();
  my_client uuid := public.rls_auth_client_id();
BEGIN
  -- Superadmin access
  IF public.rls_is_superadmin() THEN RETURN true; END IF;
  
  -- Client self
  IF my_client IS NOT NULL AND p_client_id = my_client THEN RETURN true; END IF;
  
  -- Agency admin: clients with submissions to their agency
  IF my_role = 'agency_admin' AND my_agency IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.client_id = p_client_id AND pas.agency_id = my_agency
    );
  END IF;
  
  -- Agent: only assigned clients
  IF my_role = 'agent' AND my_agency IS NOT NULL AND my_agent IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.client_id = p_client_id 
        AND pas.agency_id = my_agency 
        AND pas.agent_id = my_agent
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Force RLS on sensitive tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.client_properties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.property_agency_submissions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.property_agency_submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.property_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.client_documents FORCE ROW LEVEL SECURITY;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Clients can view own records" ON public.clients;
DROP POLICY IF EXISTS "Clients can update own records" ON public.clients;
DROP POLICY IF EXISTS "Clients can access only their own properties" ON public.client_properties;
DROP POLICY IF EXISTS "Superadmin can view all client properties" ON public.client_properties;
DROP POLICY IF EXISTS "Agency admins can view submitted properties" ON public.client_properties;
DROP POLICY IF EXISTS "Agents can view submitted properties" ON public.client_properties;

-- New secure policies for clients table
CREATE POLICY "rls_clients_select" ON public.clients FOR SELECT 
TO authenticated, anon USING (public.rls_can_read_client(id));

CREATE POLICY "rls_clients_update" ON public.clients FOR UPDATE
TO authenticated, anon 
USING (id = public.rls_auth_client_id() OR public.rls_is_superadmin())
WITH CHECK (id = public.rls_auth_client_id() OR public.rls_is_superadmin());

-- New secure policies for client_properties
CREATE POLICY "rls_cp_select" ON public.client_properties FOR SELECT
TO authenticated, anon 
USING (client_id = public.rls_auth_client_id() OR public.rls_is_superadmin() 
  OR EXISTS (SELECT 1 FROM public.property_agency_submissions pas 
    WHERE pas.property_id = client_properties.id 
      AND (
        (public.rls_auth_role() = 'agency_admin' AND pas.agency_id = public.rls_auth_agency_id())
        OR (public.rls_auth_role() = 'agent' AND pas.agency_id = public.rls_auth_agency_id() 
            AND pas.agent_id = public.rls_auth_agent_id())
      )
  )
);

CREATE POLICY "rls_cp_insert" ON public.client_properties FOR INSERT
TO authenticated, anon
WITH CHECK (client_id = public.rls_auth_client_id() OR public.rls_is_superadmin());

CREATE POLICY "rls_cp_update" ON public.client_properties FOR UPDATE
TO authenticated, anon
USING (client_id = public.rls_auth_client_id() OR public.rls_is_superadmin())
WITH CHECK (client_id = public.rls_auth_client_id() OR public.rls_is_superadmin());

-- Agent-safe view without PII
CREATE OR REPLACE VIEW public.clients_agent_view AS
SELECT c.id, c.full_name, c.created_at, c.updated_at
FROM public.clients c
WHERE public.rls_can_read_client(c.id);

-- Privilege grants
REVOKE ALL ON public.clients FROM PUBLIC;
GRANT SELECT, UPDATE ON public.clients TO authenticated, anon;
GRANT INSERT ON public.clients TO anon; -- keep public registration

REVOKE ALL ON public.client_properties FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_properties TO authenticated, anon;

-- Grant on agent-safe view
GRANT SELECT ON public.clients_agent_view TO authenticated;

-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pas_client_agency_agent 
ON public.property_agency_submissions(client_id, agency_id, agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_id ON public.clients(id);

COMMIT;