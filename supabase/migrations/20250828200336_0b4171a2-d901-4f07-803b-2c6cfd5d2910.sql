-- Enforce clients.phone and clients.phone_e164 as NOT NULL and keep them in sync via trigger
-- 1) Backfill phone_e164 for any rows missing it (using existing normalize_phone)
UPDATE public.clients
SET phone_e164 = public.normalize_phone(phone)
WHERE phone_e164 IS NULL;

-- 2) Sanity check: ensure no NULL or un-normalizable phones remain before adding NOT NULL
DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.clients
  WHERE phone IS NULL OR public.normalize_phone(phone) IS NULL;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on clients.phone/phone_e164: % invalid phone rows detected. Fix them before retry.', invalid_count
      USING HINT = 'Ensure all clients.phone values are present and normalizable by normalize_phone().';
  END IF;
END$$;

-- 3) Enforce NOT NULL on both phone fields
ALTER TABLE public.clients
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN phone_e164 SET NOT NULL;

-- 4) Ensure uniqueness on normalized phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_e164_unique
  ON public.clients (phone_e164);

-- 5) Trigger to keep phone_e164 in sync and reject missing/invalid phone immediately
CREATE OR REPLACE FUNCTION public.set_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_e164 text;
BEGIN
  -- Require phone
  IF NEW.phone IS NULL OR btrim(NEW.phone) = '' THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;

  -- Normalize and validate
  v_e164 := public.normalize_phone(NEW.phone);
  IF v_e164 IS NULL OR btrim(v_e164) = '' THEN
    RAISE EXCEPTION 'Invalid phone format';
  END IF;

  -- Keep in sync (always derive from phone)
  NEW.phone_e164 := v_e164;
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it fires on all INSERT/UPDATE attempts
DROP TRIGGER IF EXISTS trg_set_phone_e164 ON public.clients;
CREATE TRIGGER trg_set_phone_e164
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_phone_e164();