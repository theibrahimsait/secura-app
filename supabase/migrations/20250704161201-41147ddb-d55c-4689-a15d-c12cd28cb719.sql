-- CRITICAL SECURITY FIX: Fix client_properties RLS policies to prevent data leakage

-- Drop the problematic policies that are allowing cross-client access
DROP POLICY IF EXISTS "Clients can manage own properties" ON public.client_properties;
DROP POLICY IF EXISTS "Clients can manage their own properties" ON public.client_properties;

-- Create a single, secure policy using the session-based client ID function
CREATE POLICY "Clients can access only their own properties"
ON public.client_properties
FOR ALL
TO public
USING (client_id = get_client_id_from_session())
WITH CHECK (client_id = get_client_id_from_session());

-- Also fix client_documents policies for consistency
DROP POLICY IF EXISTS "Clients can view own documents" ON public.client_documents;
DROP POLICY IF EXISTS "Allow client document uploads" ON public.client_documents;

-- Create secure client document policies
CREATE POLICY "Clients can access only their own documents"
ON public.client_documents
FOR ALL
TO public
USING (client_id = get_client_id_from_session())
WITH CHECK (client_id = get_client_id_from_session());

-- Fix submissions policies as well
DROP POLICY IF EXISTS "Clients can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can view their own submissions" ON public.submissions;

CREATE POLICY "Clients can access only their own submissions"
ON public.submissions
FOR ALL
TO public
USING (client_id = get_client_id_from_session())
WITH CHECK (client_id = get_client_id_from_session());

-- Fix submission_properties policies
DROP POLICY IF EXISTS "Clients can create their submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Clients can view their submission properties" ON public.submission_properties;

CREATE POLICY "Clients can access only their own submission properties"
ON public.submission_properties
FOR ALL
TO public
USING (submission_id IN (
  SELECT id FROM public.submissions 
  WHERE client_id = get_client_id_from_session()
))
WITH CHECK (submission_id IN (
  SELECT id FROM public.submissions 
  WHERE client_id = get_client_id_from_session()
));