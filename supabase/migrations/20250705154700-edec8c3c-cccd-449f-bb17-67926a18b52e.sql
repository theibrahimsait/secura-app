-- Fix RLS policy to use write-enabled version for INSERT operations
-- This allows the session to be updated during property creation
DROP POLICY IF EXISTS "Clients can access only their own properties" ON public.client_properties;

CREATE POLICY "Clients can access only their own properties"
ON public.client_properties
FOR ALL
TO public
USING (
  client_id = get_client_id_from_session_readonly()  -- read-only for SELECT
)
WITH CHECK (
  client_id = get_client_id_from_session()  -- write-enabled for INSERT/UPDATE
);