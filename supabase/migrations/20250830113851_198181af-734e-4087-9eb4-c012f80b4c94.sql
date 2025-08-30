BEGIN;

-- 2) Keep earliest row active, quarantine rest (trigger nulls phone_e164)
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

-- 3) Ensure unique constraint exists for ON CONFLICT paths
DO $$ BEGIN
  ALTER TABLE public.clients
    ADD CONSTRAINT clients_phone_e164_unique UNIQUE (phone_e164);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already exists
END $$;

-- (Optional) drop legacy partial unique index if present
DROP INDEX IF EXISTS clients_phone_e164_active_uniq;
DROP INDEX IF EXISTS uq_clients_phone_e164_active;

COMMIT;