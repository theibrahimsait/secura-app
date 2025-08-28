-- Finalize phone_e164 rollout: deterministic dedupe, scoped DELETE, sanity guard, trigger hardening, secure RPC ownership and grants

-- 1) Recompute normalized values (idempotent)
UPDATE public.clients c
SET phone_e164 = public.normalize_phone(c.phone)
WHERE c.phone IS NOT NULL AND c.phone_e164 IS DISTINCT FROM public.normalize_phone(c.phone);

-- 2) Merge duplicates deterministically (keep oldest row)
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
         (array_remove(array_agg(cdup.referral_token ORDER BY cdup.created_at DESC), NULL))[1] AS referral_token,
         (array_remove(array_agg(cdup.agency_id      ORDER BY cdup.created_at DESC), NULL))[1] AS agency_id,
         (array_remove(array_agg(cdup.agent_id       ORDER BY cdup.created_at DESC), NULL))[1] AS agent_id,
         MAX(cdup.full_name) FILTER (WHERE cdup.full_name IS NOT NULL) AS full_name,
         MAX(cdup.email)     FILTER (WHERE cdup.email     IS NOT NULL) AS email
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

-- 3) Delete duplicate rows (redefine CTEs in this statement to avoid scope issues)
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
)
DELETE FROM public.clients c
USING merge_map mm
WHERE c.id = mm.dup_id;

-- 4) Sanity guard before enforcing NOT NULL
-- Inspect potentially invalid numbers that normalize to NULL
-- (This SELECT is informational; migration continues.)
SELECT id, phone
FROM public.clients
WHERE phone IS NOT NULL AND public.normalize_phone(phone) IS NULL;

-- Try to coerce obviously valid numbers (strip non-digits); re-normalize
UPDATE public.clients
SET phone = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL 
  AND public.normalize_phone(phone) IS NULL
  AND phone ~ '[0-9]';

-- Recompute after coercion
UPDATE public.clients c
SET phone_e164 = public.normalize_phone(c.phone)
WHERE c.phone IS NOT NULL AND c.phone_e164 IS DISTINCT FROM public.normalize_phone(c.phone);

-- Remove still-invalid rows to allow NOT NULL enforcement (rare garbage rows)
DELETE FROM public.clients
WHERE phone IS NOT NULL AND public.normalize_phone(phone) IS NULL;

-- 5) Enforce NOT NULL only if currently nullable
DO $$
DECLARE
  is_nullable text;
BEGIN
  SELECT is_nullable INTO is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'phone_e164';

  IF is_nullable = 'YES' THEN
    EXECUTE 'ALTER TABLE public.clients ALTER COLUMN phone_e164 SET NOT NULL';
  END IF;
END $$;

-- 6) Ensure unique index exists (inside tx; brief write lock). Schedule during low traffic.
CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_phone_e164 ON public.clients(phone_e164);

-- 7) Trigger to keep phone_e164 in sync (no SECURITY DEFINER needed)
CREATE OR REPLACE FUNCTION public.set_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
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

-- 8) Secure definer RPC (ensure_client) hardened and owned by postgres
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

ALTER FUNCTION public.ensure_client(text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_client(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_client(text, text) TO anon, authenticated;

-- 9) RLS and grants sanity (block direct inserts; keep RPC exec)
DROP POLICY IF EXISTS "Block direct client inserts" ON public.clients;
CREATE POLICY "Block direct client inserts" ON public.clients
FOR INSERT TO anon, authenticated
WITH CHECK (false);

REVOKE INSERT ON public.clients FROM anon, authenticated;