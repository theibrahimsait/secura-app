-- Update function to read from custom header instead of Authorization
CREATE OR REPLACE FUNCTION public.get_client_id_from_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  client_uuid UUID;
  session_token TEXT;
BEGIN
  -- Get session token from custom header
  BEGIN
    session_token := current_setting('request.headers', true)::json ->> 'x-client-session';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  -- Return NULL if no token
  IF session_token IS NULL OR session_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Find client ID from valid session
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.session_token = session_token
    AND cs.expires_at > now();
    
  -- Update last_used_at if session found
  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE session_token = session_token;
  END IF;
  
  RETURN client_uuid;
END;
$$;