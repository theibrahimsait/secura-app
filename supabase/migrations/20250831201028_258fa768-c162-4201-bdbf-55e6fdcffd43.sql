-- Ensure exact single-column unique constraint on clients.phone_e164 and a single, scoped normalization trigger
-- plus write-only RPCs for register and verify flows

-- 1) Guarantee a single-column UNIQUE constraint on phone_e164 (no duplicates/partials)
DO $$
DECLARE
  col_attnum smallint;
  uniq_exists boolean := false;
BEGIN
  SELECT attnum::smallint
    INTO col_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.clients'::regclass
    AND attname = 'phone_e164'
    AND NOT attisdropped
  LIMIT 1;

  IF col_attnum IS NULL THEN
    RAISE EXCEPTION 'Column public.clients.phone_e164 not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.clients'::regclass
      AND c.contype = 'u'
      AND c.conkey = ARRAY[col_attnum]::smallint[]
  ) INTO uniq_exists;

  IF NOT uniq_exists THEN
    -- Add exact single-column unique constraint
    EXECUTE 'ALTER TABLE public.clients ADD CONSTRAINT clients_phone_e164_key UNIQUE (phone_e164)';
  END IF;
END $$;

-- 2) Normalize trigger: drop any existing triggers calling clients_normalize_phone_trigger, then recreate
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.clients'::regclass
      AND NOT t.tgisinternal
      AND t.tgfoid = 'public.clients_normalize_phone_trigger'::regproc
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.clients;', r.tgname);
  END LOOP;

  -- Create a single scoped trigger (INSERT or UPDATE OF phone, is_quarantined)
  EXECUTE 'CREATE TRIGGER trg_clients_normalize_phone
           BEFORE INSERT OR UPDATE OF phone, is_quarantined ON public.clients
           FOR EACH ROW
           EXECUTE FUNCTION public.clients_normalize_phone_trigger()';
END $$;

-- 3) RPCs: write-only, no reads

-- Register by phone: atomic insert-or-update via ON CONFLICT (phone_e164)
CREATE OR REPLACE FUNCTION public.register_client_by_phone(
  p_phone text,
  p_referral_token text DEFAULT NULL
)
RETURNS TABLE(client_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := public.normalize_phone(p_phone);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number. Use E.164 like +9715XXXXXXX'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  INSERT INTO public.clients (phone, referral_token, updated_at)
  VALUES (normalized, p_referral_token, now())
  ON CONFLICT (phone_e164)
  DO UPDATE SET updated_at = EXCLUDED.updated_at
  RETURNING public.clients.id,
           (public.clients.xmax = 0) AS is_new;
END;
$$;

REVOKE ALL ON FUNCTION public.register_client_by_phone(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_client_by_phone(text, text) TO anon, authenticated;

-- After OTP success: mark verified and last_login (write-only)
CREATE OR REPLACE FUNCTION public.mark_client_verified(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
BEGIN
  UPDATE public.clients
  SET is_verified = true,
      last_login  = now()
  WHERE id = p_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_client_verified(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_verified(uuid) TO anon, authenticated;