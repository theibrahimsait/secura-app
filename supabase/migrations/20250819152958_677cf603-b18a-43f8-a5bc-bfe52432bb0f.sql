-- Secure client_sessions, users, and agencies; hash client session tokens; update helper functions
BEGIN;

-- Ensure pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) client_sessions hardening
REVOKE ALL ON public.client_sessions FROM PUBLIC;
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions FORCE ROW LEVEL SECURITY;

-- Add token_hash column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_sessions' AND column_name = 'token_hash'
  ) THEN
    ALTER TABLE public.client_sessions ADD COLUMN token_hash bytea;
  END IF;
END $$;

-- Backfill token_hash and wipe plaintext tokens
UPDATE public.client_sessions 
SET token_hash = digest(session_token, 'sha256')
WHERE session_token IS NOT NULL AND token_hash IS NULL;

UPDATE public.client_sessions 
SET session_token = NULL 
WHERE session_token IS NOT NULL;

-- Trigger to always hash and wipe plaintext
CREATE OR REPLACE FUNCTION public.hash_client_session_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.session_token IS NOT NULL THEN
    NEW.token_hash := digest(NEW.session_token, 'sha256');
    NEW.session_token := NULL; -- never store plaintext
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_client_session_token ON public.client_sessions;
CREATE TRIGGER trg_hash_client_session_token
BEFORE INSERT OR UPDATE OF session_token ON public.client_sessions
FOR EACH ROW EXECUTE FUNCTION public.hash_client_session_token();

-- Update helper functions to use token_hash
CREATE OR REPLACE FUNCTION public.authenticate_client_request(client_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  client_uuid UUID;
BEGIN
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(client_session_token, 'sha256')
    AND cs.expires_at > now();

  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE token_hash = digest(client_session_token, 'sha256');
  END IF;
  RETURN client_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_id_from_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  client_uuid UUID;
  token_value TEXT;
BEGIN
  BEGIN
    token_value := current_setting('request.headers', true)::json ->> 'x-client-session';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF token_value IS NULL OR token_value = '' THEN
    RETURN NULL;
  END IF;

  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(token_value, 'sha256')
    AND cs.expires_at > now();

  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE token_hash = digest(token_value, 'sha256');
  END IF;

  RETURN client_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_id_from_session_readonly()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  client_uuid UUID;
  token_value TEXT;
  headers_raw TEXT;
BEGIN
  BEGIN
    headers_raw := current_setting('request.headers', true);
    IF headers_raw IS NOT NULL AND headers_raw != '' THEN
      token_value := headers_raw::json ->> 'x-client-session';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    token_value := NULL;
  END;

  IF token_value IS NULL OR token_value = '' THEN
    RETURN NULL;
  END IF;

  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(token_value, 'sha256')
    AND cs.expires_at > now();

  RETURN client_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.debug_client_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  headers_raw text;
  session_token text;
  session_hash bytea;
  client_uuid uuid;
BEGIN
  BEGIN
    headers_raw := current_setting('request.headers', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'No headers found', 'detail', SQLERRM);
  END;

  BEGIN
    session_token := headers_raw::json ->> 'x-client-session';
  EXCEPTION WHEN OTHERS THEN
    session_token := NULL;
  END;

  IF session_token IS NOT NULL THEN
    SELECT digest(session_token, 'sha256') INTO session_hash;

    SELECT cs.client_id INTO client_uuid
    FROM public.client_sessions cs
    WHERE cs.token_hash = session_hash
      AND cs.expires_at > now();
  END IF;

  RETURN jsonb_build_object(
    'has_token', session_token IS NOT NULL,
    'session_hash', encode(COALESCE(session_hash, '\\x'::bytea), 'hex'),
    'client_id', client_uuid
  );
END;
$$;

-- RLS policies for client_sessions (no public reads)
DROP POLICY IF EXISTS "Clients can access own sessions" ON public.client_sessions;

-- Allow insert for session creation (handled by app/service); reads are blocked
CREATE POLICY "cs_insert_any" ON public.client_sessions
FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- Select/update/delete restricted to superadmin only
CREATE OR REPLACE FUNCTION public.rls_is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
$$;

CREATE POLICY "cs_select_superadmin" ON public.client_sessions
FOR SELECT TO authenticated
USING (public.rls_is_superadmin());

CREATE POLICY "cs_update_superadmin" ON public.client_sessions
FOR UPDATE TO authenticated
USING (public.rls_is_superadmin())
WITH CHECK (public.rls_is_superadmin());

CREATE POLICY "cs_delete_superadmin" ON public.client_sessions
FOR DELETE TO authenticated
USING (public.rls_is_superadmin());

-- 2) users table lockdown
REVOKE ALL ON public.users FROM PUBLIC;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Drop permissive read policies
DROP POLICY IF EXISTS "Public can read user names for referral context" ON public.users;
DROP POLICY IF EXISTS "Users and superadmins can read users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users via JWT" ON public.users;
DROP POLICY IF EXISTS "JWT based admin access" ON public.users;

-- Role helpers already exist: rls_auth_role, rls_auth_agency_id, rls_auth_user_id

-- SELECT: superadmin all; agency_admin only agency; agent self; clients none
CREATE POLICY "users_select_scoped" ON public.users
FOR SELECT TO authenticated
USING (
  public.rls_auth_role() = 'superadmin'
  OR (public.rls_auth_role() = 'agency_admin' AND agency_id = public.rls_auth_agency_id())
  OR (public.rls_auth_role() = 'agent' AND id = public.rls_auth_user_id())
);

-- UPDATE/DELETE: superadmin only
CREATE POLICY "users_update_superadmin" ON public.users
FOR UPDATE TO authenticated
USING (public.rls_auth_role() = 'superadmin')
WITH CHECK (public.rls_auth_role() = 'superadmin');

CREATE POLICY "users_delete_superadmin" ON public.users
FOR DELETE TO authenticated
USING (public.rls_auth_role() = 'superadmin');

-- 3) agencies table lockdown
REVOKE ALL ON public.agencies FROM PUBLIC;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies FORCE ROW LEVEL SECURITY;

-- Drop permissive read policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agencies;
DROP POLICY IF EXISTS "Public can read agency names for referral context" ON public.agencies;

-- SELECT: superadmin all; staff only own agency
CREATE POLICY "agencies_select_scoped" ON public.agencies
FOR SELECT TO authenticated
USING (
  public.rls_auth_role() = 'superadmin'
  OR (
    public.rls_auth_role() IN ('agency_admin','agent')
    AND id = public.rls_auth_agency_id()
  )
);

COMMIT;