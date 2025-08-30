-- Fix linter: set stable search_path on functions
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  cleaned text;
BEGIN
  IF p IS NULL THEN
    RETURN NULL;
  END IF;
  cleaned := regexp_replace(p, '[^0-9+]', '', 'g');
  IF cleaned ~ '^00[1-9][0-9]{6,14}$' THEN
    cleaned := '+' || substring(cleaned from 3);
  END IF;
  IF cleaned ~ '^\+[1-9][0-9]{7,14}$' THEN
    RETURN cleaned;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.clients_normalize_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.is_quarantined THEN
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