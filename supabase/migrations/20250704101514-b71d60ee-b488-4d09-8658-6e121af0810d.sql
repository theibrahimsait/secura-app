-- Fix the session token function to handle UUID tokens instead of JWTs
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
  -- Get session token from request headers
  BEGIN
    session_token := current_setting('request.headers', true)::json ->> 'authorization';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  -- Remove 'Bearer ' prefix if present
  IF session_token LIKE 'Bearer %' THEN
    session_token := substring(session_token from 8);
  END IF;
  
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