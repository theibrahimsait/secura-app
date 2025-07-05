-- Add RLS policy to allow agency admins to view properties submitted to their agency
CREATE POLICY "Agency admins can view submitted properties" 
ON public.client_properties 
FOR SELECT 
USING (
  id IN (
    SELECT property_id 
    FROM public.property_agency_submissions 
    WHERE agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
      AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)
  )
);