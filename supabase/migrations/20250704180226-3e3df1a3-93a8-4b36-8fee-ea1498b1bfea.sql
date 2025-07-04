-- Fix client authentication using stored session pattern
-- Create function to set client ID in session

CREATE OR REPLACE FUNCTION public.set_client_id(client_uuid uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('request.client_id', client_uuid::text, true);
$$;

-- Create function to check if client is authorized
CREATE OR REPLACE FUNCTION public.is_client_authorized(target_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
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

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Clients can manage their properties" ON public.client_properties;
DROP POLICY IF EXISTS "Clients can manage their submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can manage their submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Clients can manage their documents" ON public.client_documents;

-- Create secure RLS policies using is_client_authorized function
CREATE POLICY "Clients can access only their own properties"
ON public.client_properties
FOR ALL
TO public
USING (is_client_authorized(client_id))
WITH CHECK (is_client_authorized(client_id));

CREATE POLICY "Clients can access only their own submissions"
ON public.submissions
FOR ALL
TO public
USING (is_client_authorized(client_id))
WITH CHECK (is_client_authorized(client_id));

CREATE POLICY "Clients can access only their own submission properties"
ON public.submission_properties
FOR ALL
TO public
USING (submission_id IN (
  SELECT id FROM public.submissions 
  WHERE is_client_authorized(client_id)
))
WITH CHECK (submission_id IN (
  SELECT id FROM public.submissions 
  WHERE is_client_authorized(client_id)
));

CREATE POLICY "Clients can access only their own documents"
ON public.client_documents
FOR ALL
TO public
USING (is_client_authorized(client_id))
WITH CHECK (is_client_authorized(client_id));