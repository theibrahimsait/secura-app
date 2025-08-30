-- Simple fix: Recreate clients trigger and ensure registration policy exists

-- 1) Recreate the phone normalization trigger
DROP TRIGGER IF EXISTS clients_normalize_phone_biu ON public.clients;
CREATE TRIGGER clients_normalize_phone_biu
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.clients_normalize_phone_trigger();

-- 2) Ensure registration policy exists
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients' 
      AND policyname = 'Allow public client registration'
  ) THEN
    -- Create the policy
    CREATE POLICY "Allow public client registration"
      ON public.clients
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END$$;