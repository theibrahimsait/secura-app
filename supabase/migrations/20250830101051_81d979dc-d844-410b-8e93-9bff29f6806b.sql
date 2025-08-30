-- 1) Normalization function (idempotent)
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned text;
BEGIN
  IF p IS NULL THEN
    RETURN NULL;
  END IF;
  -- strip everything except digits and plus
  cleaned := regexp_replace(p, '[^0-9+]', '', 'g');
  -- convert 00-prefixed intl to +
  IF cleaned ~ '^00[1-9][0-9]{6,14}$' THEN
    cleaned := '+' || substring(cleaned from 3);
  END IF;
  -- ensure E.164 format: + followed by 8-15 digits total
  IF cleaned ~ '^\+[1-9][0-9]{7,14}$' THEN
    RETURN cleaned;
  END IF;
  RETURN NULL;
END;
$$ IMMUTABLE;

-- 2) Add quarantine columns and phone_e164 if missing
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS is_quarantined boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quarantine_reason text,
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz;

-- 3) Backfill normalized phone where possible
UPDATE public.clients
SET phone_e164 = public.normalize_phone(phone)
WHERE phone IS NOT NULL
  AND (phone_e164 IS NULL OR phone_e164 <> public.normalize_phone(phone));

-- 4) Quarantine rows that cannot be normalized or have missing phone
UPDATE public.clients
SET is_quarantined = true,
    quarantine_reason = COALESCE(quarantine_reason, CASE
      WHEN phone IS NULL THEN 'missing_phone'
      ELSE 'normalization_failed'
    END),
    quarantined_at = COALESCE(quarantined_at, now())
WHERE (phone IS NULL OR public.normalize_phone(phone) IS NULL)
  AND is_quarantined = false;

-- 5) Quarantine duplicates on normalized phone, keep earliest record active
WITH grouped AS (
  SELECT id, phone_e164, created_at,
         ROW_NUMBER() OVER (PARTITION BY phone_e164 ORDER BY created_at ASC, id ASC) AS rn
  FROM public.clients
  WHERE phone_e164 IS NOT NULL AND is_quarantined = false
), dupes AS (
  SELECT id FROM grouped WHERE rn > 1
)
UPDATE public.clients c
SET is_quarantined = true,
    quarantine_reason = COALESCE(quarantine_reason, 'duplicate_phone'),
    quarantined_at = COALESCE(quarantined_at, now())
FROM dupes d
WHERE c.id = d.id;

-- 6) Constraints: require phone and phone_e164 when not quarantined
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_required;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_e164_required;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_phone_required CHECK (is_quarantined OR phone IS NOT NULL),
  ADD CONSTRAINT clients_phone_e164_required CHECK (is_quarantined OR phone_e164 IS NOT NULL);

-- 7) Partial unique index on active (non-quarantined) rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_phone_e164_active
  ON public.clients (phone_e164)
  WHERE is_quarantined = false;

-- 8) Trigger to normalize and enforce on future writes
CREATE OR REPLACE FUNCTION public.clients_normalize_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- if quarantined, skip enforcement
  IF NEW.is_quarantined THEN
    RETURN NEW;
  END IF;

  -- normalize phone
  NEW.phone_e164 := public.normalize_phone(NEW.phone);

  IF NEW.phone IS NULL THEN
    RAISE EXCEPTION 'clients.phone must not be null for active records';
  END IF;

  IF NEW.phone_e164 IS NULL THEN
    RAISE EXCEPTION 'clients.phone is not a valid E.164 number for active records';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_normalize_phone ON public.clients;
CREATE TRIGGER trg_clients_normalize_phone
BEFORE INSERT OR UPDATE OF phone, is_quarantined ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.clients_normalize_phone_trigger();
