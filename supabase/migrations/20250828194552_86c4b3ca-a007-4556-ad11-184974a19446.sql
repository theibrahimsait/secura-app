-- Safer phone_e164 rollout, dedupe, trigger, secure RPC, RLS and grants

-- 0) Extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Normalize helper remains IMMUTABLE
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
    v := '+971' || v; -- TODO: pass country later if needed
  END IF;
  RETURN v;
END;
$$;

-- 2) Add phone_e164 (nullable first)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_e164 text;

-- 3) Backfill normalized values
UPDATE public.clients c
SET phone_e164 = public.normalize_phone(c.phone)
WHERE c.phone IS NOT NULL AND c.phone_e164 IS DISTINCT FROM public.normalize_phone(c.phone);

-- 3b) Detect duplicates and merge minimal fields (keep oldest)
WITH d AS (
  SELECT id, phone_e164, created_at,
         ROW_NUMBER() OVER (PARTITION BY phone_e164 ORDER BY created_at) AS rn
  FROM public.clients
  WHERE phone_e164 IS NOT NULL
),
merge_map AS (
  SELECT keep.id AS keep_id, dup.id AS dup_id
  FROM d dup
  JOIN d keep
    ON keep.phone_e164 = dup.phone_e164
   AND keep.rn = 1
   AND dup.rn > 1
),
agg AS (
  SELECT mm.keep_id,
         -- choose any non-null from duplicates
         MAX(cdup.referral_token) FILTER (WHERE cdup.referral_token IS NOT NULL) AS referral_token,
         MAX(cdup.agency_id)      FILTER (WHERE cdup.agency_id IS NOT NULL)      AS agency_id,
         MAX(cdup.agent_id)       FILTER (WHERE cdup.agent_id IS NOT NULL)       AS agent_id,
         MAX(cdup.full_name)      FILTER (WHERE cdup.full_name IS NOT NULL)      AS full_name,
         MAX(cdup.email)          FILTER (WHERE cdup.email IS NOT NULL)          AS email
  FROM merge_map mm
  JOIN public.clients cdup ON cdup.id = mm.dup_id
  GROUP BY mm.keep_id
)
UPDATE public.clients k
SET referral_token = COALESCE(k.referral_token, agg.referral_token),
    agency_id      = COALESCE(k.agency_id, agg.agency_id),
    agent_id       = COALESCE(k.agent_id, agg.agent_id),
    full_name      = COALESCE(k.full_name, agg.full_name),
    email          = COALESCE(k.email, agg.email)
FROM agg
WHERE k.id = agg.keep_id;

-- Delete duplicate rows (references: there are no declared FKs in schema list)
DELETE FROM public.clients c
USING (
  SELECT dup_id FROM merge_map
) x
WHERE c.id = x.dup_id;

-- 4) Enforce NOT NULL AFTER backfill/cleanup
ALTER TABLE public.clients
  ALTER COLUMN phone_e164 SET NOT NULL;

-- 5) Add unique index (regular create inside transaction - brief lock acceptable)
-- Note: Using non-CONCURRENTLY because migration runner wraps in a transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_phone_e164
  ON public.clients(phone_e164);

-- 6) Keep phone_e164 in sync automatically via trigger
CREATE OR REPLACE FUNCTION public.set_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.phone_e164 := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_phone_e164_set ON public.clients;
CREATE TRIGGER clients_phone_e164_set
BEFORE INSERT OR UPDATE OF phone ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_phone_e164();

-- 7) Secure, atomic upsert RPC (definer owned by postgres; search_path pinned)
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

  IF p_referral_token IS NOT NULL THEN
    SELECT rl.agency_id, rl.agent_id
      INTO v_agency, v_agent
      FROM public.referral_links rl
     WHERE rl.id::text = p_referral_token
       AND COALESCE(rl.is_active, true) = true
     LIMIT 1;
  END IF;

  INSERT INTO public.clients (phone, phone_e164, mobile_number, referral_token, agency_id, agent_id)
  VALUES (p_phone, v_phone_e164, v_phone_e164, p_referral_token, v_agency, v_agent)
  ON CONFLICT (phone_e164) DO UPDATE
    SET updated_at    = NOW(),
        referral_token = COALESCE(public.clients.referral_token, EXCLUDED.referral_token),
        agency_id      = COALESCE(public.clients.agency_id, EXCLUDED.agency_id),
        agent_id       = COALESCE(public.clients.agent_id, EXCLUDED.agent_id)
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

-- Ownership & execute grants
ALTER FUNCTION public.ensure_client(text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_client(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_client(text, text) TO anon, authenticated;

-- 8) RLS policies and grants: block direct inserts for anon/auth
DROP POLICY IF EXISTS "Allow public client registration" ON public.clients;
DROP POLICY IF EXISTS "Block direct client inserts" ON public.clients;
CREATE POLICY "Block direct client inserts" ON public.clients
FOR INSERT TO anon, authenticated
WITH CHECK (false);

-- Ensure no direct GRANT INSERT exists for anon/authenticated
REVOKE INSERT ON public.clients FROM anon, authenticated;