-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1) Deduplicate any existing hashing triggers on public.client_sessions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tg.tgname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace np ON np.oid = p.pronamespace
    JOIN pg_namespace nc ON nc.oid = c.relnamespace
    WHERE NOT tg.tgisinternal
      AND nc.nspname = 'public'
      AND c.relname = 'client_sessions'
      AND np.nspname = 'public'
      AND p.proname = 'hash_client_session_token'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.client_sessions;', r.tgname);
  END LOOP;
END$$;

-- 2) Create a single canonical hashing trigger
DROP TRIGGER IF EXISTS tg_client_sessions_hash_session_token ON public.client_sessions;
CREATE TRIGGER tg_client_sessions_hash_session_token
BEFORE INSERT OR UPDATE OF session_token ON public.client_sessions
FOR EACH ROW EXECUTE FUNCTION public.hash_client_session_token();

-- 3) Backfill token_hash only where missing (guarded)
UPDATE public.client_sessions
SET token_hash = digest(session_token::bytea, 'sha256'),
    last_used_at = COALESCE(last_used_at, now())
WHERE token_hash IS NULL
  AND session_token IS NOT NULL;

-- 4) Index to speed up token lookups (name-based guard is acceptable)
CREATE INDEX IF NOT EXISTS idx_client_sessions_token_hash
  ON public.client_sessions (token_hash);

-- 5) Secure get_client_submission_updates: use hashed token, safe search_path, and explicit grants
CREATE OR REPLACE FUNCTION public.get_client_submission_updates(
  p_client_session_token text,
  p_submission_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  submission_id uuid,
  sender_role text,
  sender_id uuid,
  client_id uuid,
  message text,
  created_at timestamptz,
  is_read boolean,
  sender_name text,
  attachments json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  requesting_client_id UUID;
  v_token_hash bytea;
BEGIN
  -- Compute digest once
  IF p_client_session_token IS NULL OR p_client_session_token = '' THEN
    RAISE NOTICE '❌ Invalid or missing session token';
    RETURN;
  END IF;

  v_token_hash := digest(p_client_session_token::bytea, 'sha256');

  -- Resolve client from hashed token
  SELECT cs.client_id INTO requesting_client_id
  FROM public.client_sessions cs
  WHERE cs.token_hash = v_token_hash
    AND cs.expires_at > now()
  LIMIT 1;

  IF requesting_client_id IS NULL THEN
    RAISE NOTICE '❌ Invalid or expired session token';
    RETURN;
  END IF;

  -- Return submission updates for this client's submissions
  RETURN QUERY
  SELECT 
    su.id,
    su.submission_id,
    su.sender_role,
    su.sender_id,
    su.client_id,
    su.message,
    su.created_at,
    su.is_read,
    COALESCE(u.full_name, c.full_name, 'Unknown') as sender_name,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', sua.id,
            'file_name', sua.file_name,
            'file_path', sua.file_path,
            'file_size', sua.file_size,
            'mime_type', sua.mime_type,
            'uploaded_at', sua.uploaded_at
          )
        )
        FROM public.submission_update_attachments sua 
        WHERE sua.update_id = su.id
      ),
      '[]'::json
    ) as attachments
  FROM public.submission_updates su
  JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
  LEFT JOIN public.users u ON su.sender_id = u.id
  LEFT JOIN public.clients c ON su.client_id = c.id
  WHERE pas.client_id = requesting_client_id
    AND (p_submission_id IS NULL OR su.submission_id = p_submission_id)
  ORDER BY su.created_at ASC;
END;
$$;

-- Lock down and grant execute explicitly
REVOKE ALL ON FUNCTION public.get_client_submission_updates(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_submission_updates(text, uuid) TO anon, authenticated, service_role;