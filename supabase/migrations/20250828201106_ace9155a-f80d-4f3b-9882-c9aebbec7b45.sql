-- Add pgcrypto extension for deduplication (if not exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add normalize_phone function (if not exists)
CREATE OR REPLACE FUNCTION public.normalize_phone(input_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF input_phone IS NULL OR btrim(input_phone) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Simple UAE phone normalization to E.164 format
  -- Remove all non-digits first
  input_phone := regexp_replace(input_phone, '[^0-9+]', '', 'g');
  
  -- Handle UAE country code scenarios
  IF input_phone ~ '^\+971' THEN
    RETURN input_phone; -- Already in E.164
  ELSIF input_phone ~ '^971' THEN
    RETURN '+' || input_phone; -- Add + prefix
  ELSIF input_phone ~ '^0[0-9]{8,9}$' THEN
    RETURN '+971' || substring(input_phone from 2); -- Remove leading 0, add +971
  ELSIF input_phone ~ '^[0-9]{8,9}$' THEN
    RETURN '+971' || input_phone; -- Add +971 prefix
  ELSE
    RETURN NULL; -- Invalid format
  END IF;
END;
$$;

-- Add phone_e164 column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'phone_e164' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN phone_e164 text;
  END IF;
END$$;

-- Backfill phone_e164 for all existing rows
UPDATE public.clients
SET phone_e164 = public.normalize_phone(phone)
WHERE phone_e164 IS NULL;

-- Handle duplicate clients by phone_e164 - first update foreign key references
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
-- Update audit_logs to point to the keep_id instead of dup_id
UPDATE public.audit_logs
SET client_id = mm.keep_id
FROM merge_map mm
WHERE audit_logs.client_id = mm.dup_id;

-- Update property_agency_submissions to point to the keep_id
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
UPDATE public.property_agency_submissions
SET client_id = mm.keep_id
FROM merge_map mm
WHERE property_agency_submissions.client_id = mm.dup_id;

-- Update client_properties to point to the keep_id
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
UPDATE public.client_properties
SET client_id = mm.keep_id
FROM merge_map mm
WHERE client_properties.client_id = mm.dup_id;

-- Update any other tables that reference clients
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
UPDATE public.client_documents
SET client_id = mm.keep_id
FROM merge_map mm
WHERE client_documents.client_id = mm.dup_id;

-- Update client_sessions
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
UPDATE public.client_sessions
SET client_id = mm.keep_id
FROM merge_map mm
WHERE client_sessions.client_id = mm.dup_id;

-- Merge data from duplicates into the keeper
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
UPDATE public.clients c
SET 
  referral_token = COALESCE(c.referral_token, agg.referral_token),
  agency_id = COALESCE(c.agency_id, agg.agency_id),
  agent_id = COALESCE(c.agent_id, agg.agent_id),
  full_name = COALESCE(c.full_name, agg.full_name),
  email = COALESCE(c.email, agg.email)
FROM agg
WHERE c.id = agg.keep_id;

-- Now delete duplicate rows (foreign keys should be updated)
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

-- Sanity check: ensure no NULL or un-normalizable phones remain before adding NOT NULL
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

-- Enforce NOT NULL on both phone and phone_e164
ALTER TABLE public.clients
  ALTER COLUMN phone_e164 SET NOT NULL;

-- Create unique index on phone_e164
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_e164_unique
  ON public.clients (phone_e164);

-- Trigger function to keep phone_e164 in sync and reject missing/invalid phone immediately
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
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;

  -- Keep in sync (always derive phone_e164 from phone)
  NEW.phone_e164 := v_e164;
  RETURN NEW;
END;
$$;

-- Create trigger to ensure it fires on all INSERT/UPDATE attempts
DROP TRIGGER IF EXISTS trg_set_phone_e164 ON public.clients;
CREATE TRIGGER trg_set_phone_e164
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_phone_e164();