-- Update the is_client_authorized function to use session-based authentication
-- instead of the problematic request.client_id setting
CREATE OR REPLACE FUNCTION public.is_client_authorized(target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN target_client_id = get_client_id_from_session();
END;
$$;

-- Remove the problematic set_client_id function that causes read-only transaction errors
DROP FUNCTION IF EXISTS public.set_client_id(uuid);