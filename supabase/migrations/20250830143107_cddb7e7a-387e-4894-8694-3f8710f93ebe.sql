-- 1) Display name: add column if not exists
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2) Drop any legacy uniques on phone or mobile_number (constraints and standalone indexes)
DO $$
DECLARE 
  r RECORD;
BEGIN
  -- Drop unique constraints on (phone) or (mobile_number)
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clients'
      AND c.contype = 'u'
      AND (
        (
          SELECT array_agg(a.attname ORDER BY a.attnum)::TEXT[]
          FROM unnest(c.conkey) WITH ORDINALITY ck(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
        ) = ANY (ARRAY[ARRAY['phone']::TEXT[], ARRAY['mobile_number']::TEXT[]])
      )
  LOOP
    EXECUTE format('ALTER TABLE public.clients DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Drop standalone unique indexes on (phone) or (mobile_number)
  FOR r IN
    SELECT i.relname AS index_name
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clients'
      AND ix.indisunique
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint c 
        WHERE c.contype = 'u' AND c.conindid = ix.indexrelid
      )
      AND (
        (
          SELECT array_agg(a.attname ORDER BY a.attnum)::TEXT[]
          FROM unnest(ix.indkey) AS attnum
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = attnum
        ) = ANY (ARRAY[ARRAY['phone']::TEXT[], ARRAY['mobile_number']::TEXT[]])
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.index_name);
  END LOOP;
END
$$;

-- 3) Ensure there is exactly one UNIQUE(phone_e164) - check by columns, not name
DO $$
DECLARE
  keep_constraint_name text := NULL;
  keep_index_name text := NULL;
  r RECORD;
BEGIN
  -- Prefer to keep a unique CONSTRAINT if present
  FOR r IN
    SELECT c.conname AS name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clients'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attnum)::TEXT[]
        FROM unnest(c.conkey) WITH ORDINALITY ck(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
      ) = ARRAY['phone_e164']::TEXT[]
  LOOP
    IF keep_constraint_name IS NULL THEN
      keep_constraint_name := r.name;
    END IF;
  END LOOP;

  -- If no constraint, look for standalone unique index to keep
  IF keep_constraint_name IS NULL THEN
    FOR r IN
      SELECT i.relname AS name
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'clients'
        AND ix.indisunique
        AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c 
          WHERE c.contype = 'u' AND c.conindid = ix.indexrelid
        )
        AND (
          SELECT array_agg(a.attname ORDER BY a.attnum)::TEXT[]
          FROM unnest(ix.indkey) AS attnum
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = attnum
        ) = ARRAY['phone_e164']::TEXT[]
    LOOP
      IF keep_index_name IS NULL THEN
        keep_index_name := r.name;
      END IF;
    END LOOP;
  END IF;

  -- If none exist, create a single constraint on phone_e164 (catch duplicate_object just in case)
  IF keep_constraint_name IS NULL AND keep_index_name IS NULL THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.clients ADD CONSTRAINT clients_phone_e164_key UNIQUE (phone_e164)';
      keep_constraint_name := 'clients_phone_e164_key';
    EXCEPTION WHEN duplicate_object THEN
      -- Another migration/run might have created it; continue
      NULL;
    END;
  END IF;

  -- Drop extra phone_e164 unique constraints except the one we keep
  FOR r IN
    SELECT c.conname AS name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clients'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attnum)::TEXT[]
        FROM unnest(c.conkey) WITH ORDINALITY ck(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
      ) = ARRAY['phone_e164']::TEXT[]
      AND (keep_constraint_name IS NULL OR c.conname <> keep_constraint_name)
  LOOP
    EXECUTE format('ALTER TABLE public.clients DROP CONSTRAINT %I', r.name);
  END LOOP;

  -- Drop extra phone_e164 standalone unique indexes except the one we keep
  FOR r IN
    SELECT i.relname AS name
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clients'
      AND ix.indisunique
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint c 
        WHERE c.contype = 'u' AND c.conindid = ix.indexrelid
      )
      AND (
        SELECT array_agg(a.attname ORDER BY a.attnum)::TEXT[]
        FROM unnest(ix.indkey) AS attnum
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = attnum
      ) = ARRAY['phone_e164']::TEXT[]
      AND (keep_index_name IS NULL OR i.relname <> keep_index_name)
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.name);
  END LOOP;
END
$$;

-- 4) Trigger wiring: ensure exactly one trigger calling public.clients_normalize_phone_trigger()
DO $$
DECLARE
  trig RECORD;
  fn_oid oid;
BEGIN
  SELECT p.oid INTO fn_oid
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE p.proname = 'clients_normalize_phone_trigger'
    AND ns.nspname = 'public'
  LIMIT 1;

  IF fn_oid IS NOT NULL THEN
    -- Drop ALL triggers on public.clients that call this function (regardless of enabled/disabled)
    FOR trig IN
      SELECT tg.tgname
      FROM pg_trigger tg
      JOIN pg_class t ON t.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'clients'
        AND tg.tgfoid = fn_oid
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.clients', trig.tgname);
    END LOOP;
  END IF;

  -- Create the canonical trigger
  BEGIN
    EXECUTE 'CREATE TRIGGER clients_normalize_phone_biu
             BEFORE INSERT OR UPDATE OF phone, is_quarantined
             ON public.clients
             FOR EACH ROW EXECUTE FUNCTION public.clients_normalize_phone_trigger()';
  EXCEPTION WHEN duplicate_object THEN
    -- Trigger already exists
    NULL;
  END;
END
$$;

-- 5) Secure RPC for login: register_client_by_phone
CREATE OR REPLACE FUNCTION public.register_client_by_phone(raw_phone TEXT, ref_token TEXT DEFAULT NULL)
RETURNS TABLE(client_id UUID, is_new BOOLEAN, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := public.normalize_phone(raw_phone);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number. Please provide a valid E.164 number.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH upsert AS (
    INSERT INTO public.clients (phone)
    VALUES (normalized)
    ON CONFLICT (phone_e164)
    DO UPDATE SET updated_at = now()
    RETURNING id, xmax, COALESCE(display_name, full_name, '') AS display_name
  )
  SELECT id, (xmax = 0) AS is_new, display_name FROM upsert;
END;
$$;

-- Lock down permissions on the RPC
REVOKE ALL ON FUNCTION public.register_client_by_phone(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_client_by_phone(TEXT, TEXT) TO anon, authenticated;