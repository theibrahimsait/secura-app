-- Update function to look for headers in multiple ways
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
  -- Method 1: Try standard request.headers  
  BEGIN
    headers_raw := current_setting('request.headers', true);
    RAISE NOTICE '🔍 Method 1 - Raw headers: %', headers_raw;
    
    IF headers_raw IS NOT NULL AND headers_raw != '' THEN
      token_value := headers_raw::json ->> 'x-client-session';
      RAISE NOTICE '🎯 Method 1 - Session token: %', COALESCE(token_value, 'NULL');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Method 1 failed: %', SQLERRM;
  END;
  
  -- Method 2: Try request.jwt.claims if available
  IF token_value IS NULL THEN
    BEGIN
      token_value := current_setting('request.jwt.claims', true)::json ->> 'client_session';
      RAISE NOTICE '🎯 Method 2 - JWT claims session: %', COALESCE(token_value, 'NULL');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Method 2 failed: %', SQLERRM;
    END;
  END IF;
  
  -- Method 3: Try custom setting
  IF token_value IS NULL THEN
    BEGIN
      token_value := current_setting('custom.client_session', true);
      RAISE NOTICE '🎯 Method 3 - Custom setting: %', COALESCE(token_value, 'NULL');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Method 3 failed: %', SQLERRM;
    END;
  END IF;
  
  -- Return NULL if no token found
  IF token_value IS NULL OR token_value = '' THEN
    RAISE NOTICE '⚠️ No session token found with any method';
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