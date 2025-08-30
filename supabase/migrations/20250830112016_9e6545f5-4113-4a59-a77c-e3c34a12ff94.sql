-- 1) Ensure columns exist for trigger dependencies
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_quarantined boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_e164 text;

-- 2) Switch to the requested trigger name and wiring
DROP TRIGGER IF EXISTS clients_normalize_phone_biu ON public.clients;
DROP TRIGGER IF EXISTS trg_clients_normalize_phone ON public.clients;

CREATE TRIGGER clients_normalize_phone_biu
BEFORE INSERT OR UPDATE OF phone, is_quarantined
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.clients_normalize_phone_trigger();

-- 3) Cleanup existing rows so future constraints remain safe
-- fill phone_e164 for active rows without firing the trigger
UPDATE public.clients
SET phone_e164 = public.normalize_phone(phone)
WHERE NOT is_quarantined;

-- quarantine rows with invalid phones (trigger will early-return due to is_quarantined=true)
UPDATE public.clients
SET is_quarantined = true
WHERE NOT is_quarantined AND public.normalize_phone(phone) IS NULL;