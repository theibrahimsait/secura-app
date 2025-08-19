-- Secure client_sessions with proper token hashing (fixed constraints)
BEGIN;

-- Ensure pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Prepare client_sessions table structure
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

-- Populate token_hash for existing records where session_token exists
UPDATE public.client_sessions 
SET token_hash = digest(session_token, 'sha256')
WHERE session_token IS NOT NULL AND token_hash IS NULL;

-- Drop NOT NULL constraint on session_token (if it exists)
ALTER TABLE public.client_sessions ALTER COLUMN session_token DROP NOT NULL;

-- Now safely clear plaintext tokens where token_hash exists
UPDATE public.client_sessions 
SET session_token = NULL 
WHERE token_hash IS NOT NULL;

-- Add NOT NULL constraint to token_hash
ALTER TABLE public.client_sessions ALTER COLUMN token_hash SET NOT NULL;

-- Create unique index on client_id + token_hash for performance and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS ux_client_sessions_hash 
ON public.client_sessions(client_id, token_hash);

-- Trigger to hash incoming tokens and prevent plaintext storage
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

-- Update authentication functions to use token_hash
CREATE OR REPLACE FUNCTION public.authenticate_client_request(client_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  client_uuid UUID;
BEGIN
  -- Find valid session by token hash
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(client_session_token, 'sha256')
    AND cs.expires_at > now();

  -- Update last_used_at if found
  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE token_hash = digest(client_session_token, 'sha256');
  END IF;
  
  RETURN client_uuid;
END;
$$;

-- Update client session readers
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

-- RLS policies for client_sessions (no public reads, tokens never exposed)
DROP POLICY IF EXISTS "Clients can access own sessions" ON public.client_sessions;

-- Allow insert only (for session creation)
CREATE POLICY "cs_insert_for_registration" ON public.client_sessions
FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- No SELECT/UPDATE/DELETE for regular users - only superadmin for admin purposes
CREATE POLICY "cs_admin_only_access" ON public.client_sessions
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin'
);

COMMIT;