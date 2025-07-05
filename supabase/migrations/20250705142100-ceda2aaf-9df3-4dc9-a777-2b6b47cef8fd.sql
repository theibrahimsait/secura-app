-- Create a read-only version of get_client_id_from_session for RLS policies
-- This version doesn't update last_used_at to avoid write operations during SELECT
CREATE OR REPLACE FUNCTION public.get_client_id_from_session_readonly()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  client_uuid UUID;
  token_value TEXT;
BEGIN
  -- Get session token from custom header
  BEGIN
    token_value := current_setting('request.headers', true)::json ->> 'x-client-session';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  -- Return NULL if no token
  IF token_value IS NULL OR token_value = '' THEN
    RETURN NULL;
  END IF;
  
  -- Find client ID from valid session (READ-ONLY - no UPDATE)
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.session_token = token_value
    AND cs.expires_at > now();
    
  RETURN client_uuid;
END;
$$;

-- Update the RLS policy to use the read-only version
DROP POLICY IF EXISTS "Clients can access only their own properties" ON public.client_properties;

CREATE POLICY "Clients can access only their own properties" 
ON public.client_properties 
FOR ALL 
TO public 
USING (client_id = get_client_id_from_session_readonly()) 
WITH CHECK (client_id = get_client_id_from_session_readonly());

-- Update is_client_authorized to use read-only version for RLS
CREATE OR REPLACE FUNCTION public.is_client_authorized(target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN target_client_id = get_client_id_from_session_readonly();
END;
$$;