-- 0) Extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Normalize helper (keep simple for now)
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE v text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  v := regexp_replace(p, '[^+0-9]', '', 'g');
  IF v = '' THEN RETURN NULL; END IF;
  IF v NOT LIKE '+%' THEN
    v := '+971' || v; -- TODO: pass country later
  END IF;
  RETURN v;
END;
$$;

-- 2) Add column (nullable first)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_e164 text;

-- 3) Backfill + quick dedupe visibility check
UPDATE public.clients
SET phone_e164 = public.normalize_phone(phone)
WHERE phone IS NOT NULL AND phone_e164 IS DISTINCT FROM public.normalize_phone(phone);

-- If duplicates exist, resolve them BEFORE the unique index:
-- e.g., keep the oldest row and merge data; example pattern:
-- WITH d AS (
--   SELECT phone_e164, id,
--          ROW_NUMBER() OVER (PARTITION BY phone_e164 ORDER BY created_at) AS rn
--   FROM public.clients
--   WHERE phone_e164 IS NOT NULL
-- )
-- DELETE FROM public.clients c
-- USING d
-- WHERE c.id = d.id AND d.rn > 1;

-- 4) Enforce NOT NULL AFTER backfill
ALTER TABLE public.clients
  ALTER COLUMN phone_e164 SET NOT NULL;

-- 5) Add unique index AFTER cleanup (race-friendly)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ux_clients_phone_e164
  ON public.clients(phone_e164);

-- 6) Secure, atomic upsert RPC (one-time referral; pinned search_path)
CREATE OR REPLACE FUNCTION public.ensure_client(
  p_phone text,
  p_referral_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_phone_e164 text;
  v_client_id uuid;
  v_agency uuid;
  v_agent uuid;
BEGIN
  v_phone_e164 := public.normalize_phone(p_phone);
  IF v_phone_e164 IS NULL THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;

  -- Optional: validate referral token first
  IF p_referral_token IS NOT NULL THEN
    SELECT rl.agency_id, rl.agent_id
      INTO v_agency, v_agent
      FROM public.referral_links rl
     WHERE rl.id::text = p_referral_token
       AND COALESCE(rl.is_active, true) = true
     LIMIT 1;
  END IF;

  -- Single atomic upsert
  INSERT INTO public.clients (phone, phone_e164, mobile_number, referral_token, agency_id, agent_id)
  VALUES (p_phone, v_phone_e164, v_phone_e164, p_referral_token, v_agency, v_agent)
  ON CONFLICT (phone_e164) DO UPDATE
    SET updated_at    = NOW(),
        -- one-time referral assignment only if blank:
        referral_token = COALESCE(public.clients.referral_token, EXCLUDED.referral_token),
        agency_id      = COALESCE(public.clients.agency_id, EXCLUDED.agency_id),
        agent_id       = COALESCE(public.clients.agent_id, EXCLUDED.agent_id)
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_client(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_client(text, text) TO anon, authenticated;

-- 7) Update RLS policies to prevent direct INSERT while allowing RPC
DROP POLICY IF EXISTS "Allow public client registration" ON public.clients;

-- Allow RPC usage but block direct inserts
CREATE POLICY "Block direct client inserts" ON public.clients
FOR INSERT TO anon, authenticated
WITH CHECK (false);