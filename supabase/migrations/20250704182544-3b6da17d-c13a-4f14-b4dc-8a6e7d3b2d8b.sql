-- Fix security issue: Update functions to have secure search_path
CREATE OR REPLACE FUNCTION public.set_client_id(client_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT set_config('request.client_id', client_uuid::text, true);
$$;

CREATE OR REPLACE FUNCTION public.is_client_authorized(target_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actual_client_id UUID;
BEGIN
  BEGIN
    actual_client_id := current_setting('request.client_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  RETURN actual_client_id = target_client_id;
END;
$$;