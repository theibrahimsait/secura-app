-- Comprehensive RLS hardening and relationship-based access model
-- NOTE: This migration adapts to the existing schema discovered in the project
-- Key points:
-- - Clients are authenticated via client_sessions header -> use get_client_id_from_session_readonly()
-- - Staff (agency_admin/agent/superadmin) authenticated via Supabase Auth JWT app_metadata
-- - Avoid using clients.agency_id/agent_id for authorization; use relationships (property_agency_submissions)

BEGIN;

-- 1) Default privilege hardening for future objects (no public regressions)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;

-- 2) Helper: role, agency, domain ids (search_path pinned, null-safe)
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

-- Map current auth user to domain users.id (staff). May be NULL.
CREATE OR REPLACE FUNCTION public.rls_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Agent domain id: users.id with role 'agent'. NULL if not an agent
CREATE OR REPLACE FUNCTION public.rls_auth_agent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.role = 'agent'::user_role
  LIMIT 1;
$$;

-- Superadmin helper
CREATE OR REPLACE FUNCTION public.rls_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (public.rls_auth_role() = 'superadmin');
$$;

-- Client id via header session (no leakage, returns exactly one or NULL)
CREATE OR REPLACE FUNCTION public.rls_auth_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.get_client_id_from_session_readonly();
$$;

-- 3) Central predicates (single source of truth)
-- Can read client by relationship
CREATE OR REPLACE FUNCTION public.rls_can_read_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  my_role text := public.rls_auth_role();
  my_agency uuid := public.rls_auth_agency_id();
  my_agent uuid := public.rls_auth_agent_id();
  my_client uuid := public.rls_auth_client_id();
BEGIN
  IF public.rls_is_superadmin() THEN
    RETURN true;
  END IF;

  -- Client self
  IF my_client IS NOT NULL AND p_client_id = my_client THEN
    RETURN true;
  END IF;

  -- Agency admin: any client with at least one submission to admin's agency
  IF my_role = 'agency_admin' AND my_agency IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.property_agency_submissions pas
      WHERE pas.client_id = p_client_id
        AND pas.agency_id = my_agency
    );
  END IF;

  -- Agent: clients with submissions assigned to me at my agency
  IF my_role = 'agent' AND my_agency IS NOT NULL AND my_agent IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.property_agency_submissions pas
      WHERE pas.client_id = p_client_id
        AND pas.agency_id = my_agency
        AND pas.agent_id = my_agent
    );
  END IF;

  RETURN false;
END;
$$;

-- Can read property
CREATE OR REPLACE FUNCTION public.rls_can_read_property(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  my_role text := public.rls_auth_role();
  my_agency uuid := public.rls_auth_agency_id();
  my_agent uuid := public.rls_auth_agent_id();
  my_client uuid := public.rls_auth_client_id();
  prop_client uuid;
BEGIN
  IF public.rls_is_superadmin() THEN
    RETURN true;
  END IF;

  -- Owner (client)
  SELECT cp.client_id INTO prop_client FROM public.client_properties cp WHERE cp.id = p_property_id;
  IF my_client IS NOT NULL AND prop_client IS NOT NULL AND prop_client = my_client THEN
    RETURN true;
  END IF;

  -- Agency admin via submissions
  IF my_role = 'agency_admin' AND my_agency IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.property_id = p_property_id
        AND pas.agency_id = my_agency
    );
  END IF;

  -- Agent via assigned submission
  IF my_role = 'agent' AND my_agency IS NOT NULL AND my_agent IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.property_id = p_property_id
        AND pas.agency_id = my_agency
        AND pas.agent_id = my_agent
    );
  END IF;

  RETURN false;
END;
$$;

-- Identity doc helper (robust to enums/text)
CREATE OR REPLACE FUNCTION public.rls_is_identity_doc(p_doc_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT LOWER(COALESCE(p_doc_type, '')) IN (
    'eid','emirates_id','id','identity','id_card','passport','visa','national_id'
  );
$$;

-- Can read property document; block agents from identity doc types
CREATE OR REPLACE FUNCTION public.rls_can_read_property_document(p_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  my_role text := public.rls_auth_role();
  my_agency uuid := public.rls_auth_agency_id();
  my_agent uuid := public.rls_auth_agent_id();
  my_client uuid := public.rls_auth_client_id();
  d_type text;
  cp_id uuid;
  d_client uuid;
BEGIN
  IF public.rls_is_superadmin() THEN
    RETURN true;
  END IF;

  SELECT pd.document_type::text, pd.client_property_id, pd.client_id
  INTO d_type, cp_id, d_client
  FROM public.property_documents pd
  WHERE pd.id = p_document_id;

  -- Agent cannot view identity docs
  IF my_role = 'agent' AND public.rls_is_identity_doc(d_type) THEN
    RETURN false;
  END IF;

  -- Client owner
  IF my_client IS NOT NULL AND (d_client = my_client OR EXISTS (
      SELECT 1 FROM public.client_properties cp WHERE cp.id = cp_id AND cp.client_id = my_client
  )) THEN
    RETURN true;
  END IF;

  -- Agency admin via submission
  IF my_role = 'agency_admin' AND my_agency IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.property_id = cp_id
        AND pas.agency_id = my_agency
    );
  END IF;

  -- Agent via assigned submission (non-identity docs only)
  IF my_role = 'agent' AND my_agency IS NOT NULL AND my_agent IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.property_id = cp_id
        AND pas.agency_id = my_agency
        AND pas.agent_id = my_agent
    );
  END IF;

  RETURN false;
END;
$$;

-- Can read client identity document (client_documents)
CREATE OR REPLACE FUNCTION public.rls_can_read_client_document(p_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  my_role text := public.rls_auth_role();
  my_agency uuid := public.rls_auth_agency_id();
  my_client uuid := public.rls_auth_client_id();
  d_client uuid;
BEGIN
  IF public.rls_is_superadmin() THEN
    RETURN true;
  END IF;

  SELECT cd.client_id INTO d_client FROM public.client_documents cd WHERE cd.id = p_document_id;

  -- Client owner
  IF my_client IS NOT NULL AND d_client = my_client THEN
    RETURN true;
  END IF;

  -- Agency admin via submissions (agents intentionally excluded)
  IF my_role = 'agency_admin' AND my_agency IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.client_id = d_client
        AND pas.agency_id = my_agency
    );
  END IF;

  RETURN false;
END;
$$;

-- Can update property: owner or superadmin (admins can be added later for specific fields)
CREATE OR REPLACE FUNCTION public.rls_can_update_property(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  my_client uuid := public.rls_auth_client_id();
  prop_client uuid;
BEGIN
  IF public.rls_is_superadmin() THEN
    RETURN true;
  END IF;

  SELECT cp.client_id INTO prop_client FROM public.client_properties cp WHERE cp.id = p_property_id;
  RETURN (my_client IS NOT NULL AND prop_client = my_client);
END;
$$;

-- 4) Force RLS on sensitive tables
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

-- 5) Tight, relationship-based policies
-- Clients: drop permissive policies
DROP POLICY IF EXISTS "Clients can view own records" ON public.clients;
DROP POLICY IF EXISTS "Clients can update own records" ON public.clients;

-- SELECT restricted by relationship
CREATE POLICY "rls_clients_select"
AS RESTRICTIVE
ON public.clients
FOR SELECT
TO authenticated, anon
USING (public.rls_can_read_client(id));

-- UPDATE: client self or superadmin
CREATE POLICY "rls_clients_update"
AS RESTRICTIVE
ON public.clients
FOR UPDATE
TO authenticated, anon
USING (id = public.rls_auth_client_id() OR public.rls_is_superadmin())
WITH CHECK (id = public.rls_auth_client_id() OR public.rls_is_superadmin());

-- INSERT: preserve existing public registration if relied upon (commented policy kept if exists)
-- If you want to restrict later, route signups via edge function with service role.
-- Keep existing INSERT policy or ensure anon can insert with checks at app layer.

-- DELETE: superadmin only
CREATE POLICY "rls_clients_delete_superadmin"
AS RESTRICTIVE
ON public.clients
FOR DELETE
TO authenticated
USING (public.rls_is_superadmin());

-- client_properties
DROP POLICY IF EXISTS "Clients can access only their own properties" ON public.client_properties;
DROP POLICY IF EXISTS "Superadmin can view all client properties" ON public.client_properties;
DROP POLICY IF EXISTS "Agency admins can view submitted properties" ON public.client_properties;
DROP POLICY IF EXISTS "Agents can view submitted properties" ON public.client_properties;

CREATE POLICY "rls_cp_select"
AS RESTRICTIVE
ON public.client_properties
FOR SELECT
TO authenticated, anon
USING (public.rls_can_read_property(id));

CREATE POLICY "rls_cp_insert_update_delete"
AS RESTRICTIVE
ON public.client_properties
FOR ALL
TO authenticated, anon
USING (public.rls_can_update_property(id) OR public.rls_is_superadmin())
WITH CHECK (public.rls_can_update_property(id) OR public.rls_is_superadmin());

-- property_agency_submissions
DROP POLICY IF EXISTS "Agency admins can manage their submissions" ON public.property_agency_submissions;
DROP POLICY IF EXISTS "Agents can view their assigned submissions" ON public.property_agency_submissions;
DROP POLICY IF EXISTS "Clients can create property submissions" ON public.property_agency_submissions;
DROP POLICY IF EXISTS "Clients can create submissions" ON public.property_agency_submissions;
DROP POLICY IF EXISTS "Clients can view their own submissions" ON public.property_agency_submissions;
DROP POLICY IF EXISTS "Clients can view their property submissions" ON public.property_agency_submissions;

-- SELECT for owner, admin in same agency, or assigned agent, or superadmin
CREATE POLICY "rls_pas_select"
AS RESTRICTIVE
ON public.property_agency_submissions
FOR SELECT
TO authenticated, anon
USING (
  public.rls_is_superadmin()
  OR (client_id = public.rls_auth_client_id())
  OR (
    (public.rls_auth_role() = 'agency_admin' AND agency_id = public.rls_auth_agency_id())
  )
  OR (
    (public.rls_auth_role() = 'agent' AND agency_id = public.rls_auth_agency_id() AND agent_id = public.rls_auth_agent_id())
  )
);

-- INSERT: owner (client) or agency_admin or superadmin
CREATE POLICY "rls_pas_insert"
AS RESTRICTIVE
ON public.property_agency_submissions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  public.rls_is_superadmin()
  OR (client_id = public.rls_auth_client_id())
  OR (public.rls_auth_role() = 'agency_admin' AND agency_id = public.rls_auth_agency_id())
);

-- UPDATE: superadmin or agency_admin of same agency
CREATE POLICY "rls_pas_update"
AS RESTRICTIVE
ON public.property_agency_submissions
FOR UPDATE
TO authenticated, anon
USING (
  public.rls_is_superadmin()
  OR (public.rls_auth_role() = 'agency_admin' AND agency_id = public.rls_auth_agency_id())
)
WITH CHECK (
  public.rls_is_superadmin()
  OR (public.rls_auth_role() = 'agency_admin' AND agency_id = public.rls_auth_agency_id())
);

-- DELETE: superadmin only
CREATE POLICY "rls_pas_delete"
AS RESTRICTIVE
ON public.property_agency_submissions
FOR DELETE
TO authenticated
USING (public.rls_is_superadmin());

-- property_documents
DROP POLICY IF EXISTS "Agency admins can view submitted property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agency staff can view submitted property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Clients can access their property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Clients can manage their property documents" ON public.property_documents;

CREATE POLICY "rls_pd_select"
AS RESTRICTIVE
ON public.property_documents
FOR SELECT
TO authenticated, anon
USING (public.rls_can_read_property_document(id));

CREATE POLICY "rls_pd_mutate_owner_or_superadmin"
AS RESTRICTIVE
ON public.property_documents
FOR INSERT, UPDATE, DELETE
TO authenticated, anon
USING (
  public.rls_is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.client_properties cp
    WHERE cp.id = property_documents.client_property_id
      AND cp.client_id = public.rls_auth_client_id()
  )
)
WITH CHECK (
  public.rls_is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.client_properties cp
    WHERE cp.id = property_documents.client_property_id
      AND cp.client_id = public.rls_auth_client_id()
  )
);

-- client_documents (identity docs) - block agents entirely
DROP POLICY IF EXISTS "Agents and admins can view client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Agency admins can view identity documents of submitting clients" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can access their own documents" ON public.client_documents;
DROP POLICY IF EXISTS "Superadmin can view all client documents" ON public.client_documents;

CREATE POLICY "rls_cd_select"
AS RESTRICTIVE
ON public.client_documents
FOR SELECT
TO authenticated, anon
USING (
  public.rls_is_superadmin()
  OR (client_id = public.rls_auth_client_id())
  OR (
    public.rls_auth_role() = 'agency_admin' AND EXISTS (
      SELECT 1 FROM public.property_agency_submissions pas
      WHERE pas.client_id = client_documents.client_id
        AND pas.agency_id = public.rls_auth_agency_id()
    )
  )
);

CREATE POLICY "rls_cd_mutate_owner_or_superadmin"
AS RESTRICTIVE
ON public.client_documents
FOR INSERT, UPDATE, DELETE
TO authenticated, anon
USING (public.rls_is_superadmin() OR client_id = public.rls_auth_client_id())
WITH CHECK (public.rls_is_superadmin() OR client_id = public.rls_auth_client_id());

-- 6) Agent-safe view of clients (no PII: no phone, email)
CREATE OR REPLACE VIEW public.clients_agent_view AS
SELECT c.id, c.full_name, c.created_at, c.updated_at
FROM public.clients c
WHERE public.rls_can_read_client(c.id);

COMMENT ON VIEW public.clients_agent_view IS 'Agent-safe client view without PII (no phone/email). RLS enforced via predicate function.';

-- 7) Privilege surface (grants). Note: clients/clients_properties are used by anon (client-side) with header-based session; keep anon grants but rely on RLS for filtering.
DO $$
BEGIN
  -- Clients
  REVOKE ALL ON public.clients FROM PUBLIC;
  GRANT SELECT, UPDATE ON public.clients TO authenticated, anon;
  GRANT INSERT ON public.clients TO anon; -- keep public registration path

  -- Client properties
  REVOKE ALL ON public.client_properties FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_properties TO authenticated, anon;

  -- Property agency submissions
  REVOKE ALL ON public.property_agency_submissions FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_agency_submissions TO authenticated, anon;

  -- Property documents
  REVOKE ALL ON public.property_documents FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_documents TO authenticated, anon;

  -- Client documents
  REVOKE ALL ON public.client_documents FROM PUBLIC;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated, anon;

  -- Agent-safe view
  GRANT SELECT ON public.clients_agent_view TO authenticated; -- agents are authenticated
END $$;

-- 8) Indexing for RLS performance
CREATE INDEX IF NOT EXISTS idx_clients_id ON public.clients(id);
CREATE INDEX IF NOT EXISTS idx_cp_client_id ON public.client_properties(client_id);
CREATE INDEX IF NOT EXISTS idx_pas_client_id ON public.property_agency_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_pas_property_id ON public.property_agency_submissions(property_id);
CREATE INDEX IF NOT EXISTS idx_pas_agency_id ON public.property_agency_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_pas_agent_id ON public.property_agency_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_pd_cp_id ON public.property_documents(client_property_id);
CREATE INDEX IF NOT EXISTS idx_pd_document_type ON public.property_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_cd_client_id ON public.client_documents(client_id);

COMMIT;