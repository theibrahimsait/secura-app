-- Fix the client_properties RLS policy to use the correct session-based function
-- Drop the current problematic policy
DROP POLICY IF EXISTS "Clients can access their own properties" ON public.client_properties;

-- Create a new policy that uses the session-based client ID function
CREATE POLICY "Clients can access only their own properties"
ON public.client_properties
FOR ALL
TO public
USING (client_id = get_client_id_from_session())
WITH CHECK (client_id = get_client_id_from_session());

-- Also create a helper function that uses the session token directly
-- This eliminates the need for the separate set_client_id step
CREATE OR REPLACE FUNCTION public.get_current_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN get_client_id_from_session();
END;
$$;