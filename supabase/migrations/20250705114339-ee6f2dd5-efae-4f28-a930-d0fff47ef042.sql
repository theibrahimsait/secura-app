-- Drop all triggers that depend on the inherit_client_agency_info function
DROP TRIGGER IF EXISTS before_insert_inherit_client_agency_info ON public.client_properties;
DROP TRIGGER IF EXISTS inherit_client_agency_info_trigger ON public.client_properties;
DROP TRIGGER IF EXISTS inherit_agency_info ON public.client_properties;

-- Now drop the function
DROP FUNCTION IF EXISTS public.inherit_client_agency_info;