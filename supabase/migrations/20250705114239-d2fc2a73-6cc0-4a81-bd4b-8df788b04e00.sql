-- Drop the outdated trigger that sets agent_id/agency_id on client_properties
DROP TRIGGER IF EXISTS before_insert_inherit_client_agency_info ON public.client_properties;

-- Drop any other legacy triggers that might reference removed fields
DROP TRIGGER IF EXISTS inherit_client_agency_info_trigger ON public.client_properties;

-- Drop the function associated with the old trigger logic
DROP FUNCTION IF EXISTS public.inherit_client_agency_info;