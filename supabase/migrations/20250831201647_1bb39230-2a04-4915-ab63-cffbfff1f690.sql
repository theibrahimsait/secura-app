-- Patch: ensure mobile_number is populated on register
CREATE OR REPLACE FUNCTION public.register_client_by_phone(
  p_phone text,
  p_referral_token text DEFAULT NULL
)
RETURNS TABLE(client_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := public.normalize_phone(p_phone);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number. Use E.164 like +9715XXXXXXX'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  INSERT INTO public.clients (phone, mobile_number, referral_token, updated_at)
  VALUES (normalized, normalized, p_referral_token, now())
  ON CONFLICT (phone_e164)
  DO UPDATE SET updated_at = EXCLUDED.updated_at
  RETURNING public.clients.id,
           (public.clients.xmax = 0) AS is_new;
END;
$$;

REVOKE ALL ON FUNCTION public.register_client_by_phone(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_client_by_phone(text, text) TO anon, authenticated;