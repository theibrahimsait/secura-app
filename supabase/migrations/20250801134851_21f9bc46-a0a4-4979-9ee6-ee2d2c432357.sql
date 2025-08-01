-- Add superadmin access policies for client_documents table
CREATE POLICY "Superadmin can view all client documents" 
ON public.client_documents 
FOR SELECT 
USING (
  (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superadmin'::text)
);

-- Add superadmin access policies for client_properties table  
CREATE POLICY "Superadmin can view all client properties" 
ON public.client_properties 
FOR SELECT 
USING (
  (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superadmin'::text)
);