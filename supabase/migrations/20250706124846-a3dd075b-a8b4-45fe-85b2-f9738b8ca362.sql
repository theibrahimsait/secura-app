-- Add debug logging to get_client_id_from_session_readonly function
CREATE OR REPLACE FUNCTION public.get_client_id_from_session_readonly()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  client_uuid UUID;
  token_value TEXT;
  headers_raw TEXT;
BEGIN
  -- Get raw headers for debugging
  BEGIN
    headers_raw := current_setting('request.headers', true);
    RAISE NOTICE '🔍 Raw headers: %', headers_raw;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to get raw headers: %', SQLERRM;
  END;

  -- Get session token from custom header
  BEGIN
    token_value := current_setting('request.headers', true)::json ->> 'x-client-session';
    RAISE NOTICE '🎯 Session token from x-client-session header: %', COALESCE(token_value, 'NULL');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to parse x-client-session header: %', SQLERRM;
    RETURN NULL;
  END;
  
  -- Return NULL if no token
  IF token_value IS NULL OR token_value = '' THEN
    RAISE NOTICE '⚠️ No session token found in headers';
    RETURN NULL;
  END IF;
  
  -- Find client ID from valid session (READ-ONLY - no UPDATE)
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.session_token = token_value
    AND cs.expires_at > now();
    
  RAISE NOTICE '👤 Found client_id: % for token: %', COALESCE(client_uuid::text, 'NULL'), token_value;
    
  RETURN client_uuid;
END;
$function$;