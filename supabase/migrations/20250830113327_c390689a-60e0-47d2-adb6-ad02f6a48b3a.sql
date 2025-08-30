BEGIN;

-- Update trigger: quarantined rows shouldn't reserve normalized phone
CREATE OR REPLACE FUNCTION public.clients_normalize_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
BEGIN
  IF NEW.is_quarantined THEN
    -- Quarantined rows should not hold a normalized value that could clash
    NEW.phone_e164 := NULL;
    RETURN NEW;
  END IF;

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

-- Backfill: clear e164 for already-quarantined rows
UPDATE public.clients
SET phone_e164 = NULL
WHERE is_quarantined;

-- Create a TRUE UNIQUE CONSTRAINT used by ON CONFLICT
DO $$ BEGIN
  ALTER TABLE public.clients
    ADD CONSTRAINT clients_phone_e164_unique UNIQUE (phone_e164);
EXCEPTION WHEN duplicate_object THEN
  -- already exists
  NULL;
END $$;

-- Drop any old partial unique index; redundant now
DROP INDEX IF EXISTS clients_phone_e164_active_uniq;
DROP INDEX IF EXISTS uq_clients_phone_e164_active;

COMMIT;