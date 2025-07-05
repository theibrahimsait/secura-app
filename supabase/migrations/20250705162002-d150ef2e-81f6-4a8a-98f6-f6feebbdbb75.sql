-- Add RLS policies for agency admins to view documents from submitted properties and clients

-- 1. Allow agency admins to view property documents for submitted properties
CREATE POLICY "Agency admins can view submitted property documents"
ON public.property_documents
FOR SELECT
USING (
  property_id IN (
    SELECT property_id
    FROM public.property_agency_submissions
    WHERE agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
      AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)
  )
);

-- 2. Allow agency admins to view client documents from clients who submitted properties to their agency
CREATE POLICY "Agency admins can view identity documents of submitting clients"
ON public.client_documents
FOR SELECT
USING (
  client_id IN (
    SELECT client_id
    FROM public.property_agency_submissions
    WHERE agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
      AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)
  )
);