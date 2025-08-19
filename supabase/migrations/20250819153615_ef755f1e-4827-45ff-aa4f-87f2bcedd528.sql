-- Add minimal policies for tables with RLS enabled but no policies
BEGIN;

-- client_links table - appears unused, deny all access except superadmin
CREATE POLICY "client_links_superadmin_only" ON public.client_links
FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- documents table - appears unused, deny all access except superadmin
CREATE POLICY "documents_superadmin_only" ON public.documents
FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- properties table - appears unused (using client_properties instead), deny all except superadmin
CREATE POLICY "properties_superadmin_only" ON public.properties
FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

COMMIT;