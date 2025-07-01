drop function if exists "public"."log_audit_event"(p_user_id uuid, p_client_id uuid, p_action audit_action__old_version_to_be_dropped, p_resource_type text, p_resource_id uuid, p_details jsonb, p_ip_address inet, p_user_agent text);

drop type "public"."audit_action__old_version_to_be_dropped";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_user_id uuid, p_client_id uuid, p_action audit_action, p_resource_type text, p_resource_id uuid, p_details jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, client_id, action, resource_type, resource_id, 
    details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_client_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$
;


