-- Test the get_client_id_from_session function
-- First, let's create a simple test function to debug the header issue
CREATE OR REPLACE FUNCTION public.debug_client_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  headers_raw text;
  session_token text;
  client_uuid uuid;
BEGIN
  -- Try to get the raw headers
  BEGIN
    headers_raw := current_setting('request.headers', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'No headers found', 'detail', SQLERRM);
  END;
  
  -- Try to parse the session token
  BEGIN
    session_token := headers_raw::json ->> 'x-client-session';
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to parse headers', 
      'raw_headers', headers_raw,
      'detail', SQLERRM
    );
  END;
  
  -- Try to find client
  IF session_token IS NOT NULL THEN
    SELECT cs.client_id INTO client_uuid
    FROM public.client_sessions cs
    WHERE cs.session_token = session_token
      AND cs.expires_at > now();
  END IF;
  
  RETURN jsonb_build_object(
    'raw_headers', headers_raw,
    'session_token', session_token,
    'client_id', client_uuid,
    'has_token', session_token IS NOT NULL,
    'has_client', client_uuid IS NOT NULL
  );
END;
$$;