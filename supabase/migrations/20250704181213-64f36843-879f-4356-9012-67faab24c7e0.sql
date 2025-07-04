-- Fix RLS by implementing proper client session context
-- Create a setter function to store client ID in session context
CREATE OR REPLACE FUNCTION public.set_client_id(client_uuid uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('request.client_id', client_uuid::text, true);
$$;

-- Update is_client_authorized to check against stored client ID
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

-- Update client_properties policies to use proper client authorization
DROP POLICY IF EXISTS "Clients can manage their properties" ON public.client_properties;
CREATE POLICY "Clients can access their own properties"
ON public.client_properties
FOR ALL
TO public
USING (public.is_client_authorized(client_id))
WITH CHECK (public.is_client_authorized(client_id));

-- Update submissions policies
DROP POLICY IF EXISTS "Clients can manage their submissions" ON public.submissions;
CREATE POLICY "Clients can access their own submissions"
ON public.submissions
FOR ALL
TO public
USING (public.is_client_authorized(client_id))
WITH CHECK (public.is_client_authorized(client_id));

-- Update submission_properties policies
DROP POLICY IF EXISTS "Clients can manage their submission properties" ON public.submission_properties;
CREATE POLICY "Clients can access their own submission properties"
ON public.submission_properties
FOR ALL
TO public
USING (public.is_client_authorized((SELECT client_id FROM submissions WHERE id = submission_id)))
WITH CHECK (public.is_client_authorized((SELECT client_id FROM submissions WHERE id = submission_id)));

-- Update client_documents policies
DROP POLICY IF EXISTS "Clients can manage their documents" ON public.client_documents;
CREATE POLICY "Clients can access their own documents"
ON public.client_documents
FOR ALL
TO public
USING (public.is_client_authorized(client_id))
WITH CHECK (public.is_client_authorized(client_id));