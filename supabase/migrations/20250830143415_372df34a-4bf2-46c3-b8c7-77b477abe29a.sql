-- Ensure clients phone normalization trigger exists and runs before insert/update
BEGIN;

-- 1) Recreate the trigger to be safe (drops any disabled trigger too)
DROP TRIGGER IF EXISTS clients_normalize_phone_biu ON public.clients;
CREATE TRIGGER clients_normalize_phone_biu
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.clients_normalize_phone_trigger();

-- 2) Ensure a permissive insert policy exists to allow public client registration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients' 
      AND policyname = 'Allow public client registration'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Allow public client registration"
      ON public.clients
      FOR INSERT
      TO public
      WITH CHECK (true);
    $$;
  END IF;
END$$;

COMMIT;