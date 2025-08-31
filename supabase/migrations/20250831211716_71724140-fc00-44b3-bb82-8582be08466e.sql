-- 1) Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create index on token_hash if missing (fast lookups)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_client_sessions_token_hash'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_client_sessions_token_hash ON public.client_sessions (token_hash);
  END IF;
END$$;

-- 3) Backfill: hash any existing plaintext tokens and remove plaintext
UPDATE public.client_sessions
SET token_hash = digest(session_token::bytea, 'sha256'),
    session_token = NULL
WHERE session_token IS NOT NULL
  AND token_hash IS NULL;

-- 4) Drop ALL existing triggers on client_sessions that call hash_client_session_token to avoid duplication
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT tg.tgname
    FROM pg_trigger tg
    JOIN pg_class tbl ON tbl.oid = tg.tgrelid
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace n ON n.oid = tbl.relnamespace
    WHERE NOT tg.tgisinternal
      AND n.nspname = 'public'
      AND tbl.relname = 'client_sessions'
      AND p.proname = 'hash_client_session_token'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.client_sessions;', trg.tgname);
  END LOOP;
END $$;

-- 5) Create a single canonical trigger that hashes on insert/update of session_token
CREATE TRIGGER trg_client_sessions_hash_token
BEFORE INSERT OR UPDATE OF session_token ON public.client_sessions
FOR EACH ROW
EXECUTE FUNCTION public.hash_client_session_token();

-- 6) Replace create_client_session with expiring insert and server/optional client token
CREATE OR REPLACE FUNCTION public.create_client_session(
  p_client_id uuid,
  p_token text DEFAULT NULL,
  p_ttl interval DEFAULT '30 days'
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $fn$
DECLARE
  v_token text;
BEGIN
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'p_client_id is required';
  END IF;

  -- Generate a secure random token if none provided
  v_token := COALESCE(p_token, encode(gen_random_bytes(32), 'hex'));

  -- Insert: trigger will hash and null the plaintext column
  INSERT INTO public.client_sessions (client_id, session_token, expires_at)
  VALUES (p_client_id, v_token, now() + p_ttl);

  -- Return the plaintext token to the caller only
  RETURN v_token;
END;
$fn$;

-- 7) Lock down privileges
REVOKE ALL ON FUNCTION public.create_client_session(uuid, text, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_session(uuid, text, interval) TO anon, authenticated;