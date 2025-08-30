BEGIN;

-- Drop legacy UNIQUE on raw phone
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_phone_key;

-- Ensure exactly one trigger is wired
DROP TRIGGER IF EXISTS clients_normalize_phone ON public.clients;
DROP TRIGGER IF EXISTS clients_normalize_phone_biu ON public.clients;

CREATE TRIGGER clients_normalize_phone_biu
BEFORE INSERT OR UPDATE OF phone, is_quarantined
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.clients_normalize_phone_trigger();

-- Backfill normalized phone for active rows
UPDATE public.clients
SET phone_e164 = public.normalize_phone(phone)
WHERE NOT is_quarantined;

-- Quarantine duplicates by phone_e164 (keep earliest)
WITH r AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY phone_e164
           ORDER BY created_at NULLS FIRST, id
         ) AS rn
  FROM public.clients
  WHERE phone_e164 IS NOT NULL
)
UPDATE public.clients c
SET is_quarantined = true
FROM r
WHERE c.id = r.id AND r.rn > 1;

-- Ensure true UNIQUE on phone_e164 exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.clients'::regclass
      AND conname  = 'clients_phone_e164_unique'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_phone_e164_unique UNIQUE (phone_e164);
  END IF;
END $$;

-- Drop legacy partial indexes (if any)
DROP INDEX IF EXISTS clients_phone_e164_active_uniq;
DROP INDEX IF EXISTS uq_clients_phone_e164_active;

COMMIT;