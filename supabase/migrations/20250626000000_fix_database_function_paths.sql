-- Fix function search paths

-- Update get_superadmin_auth_user_id function
CREATE OR REPLACE FUNCTION public.get_superadmin_auth_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Try to find the auth user by email
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'theibrahimsait@gmail.com'
  LIMIT 1;
  
  RETURN auth_user_id;
END;
$$;

-- Update log_audit_event function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_client_id UUID,
  p_action audit_action,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$; 