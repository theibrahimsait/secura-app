-- Fix existing functions to use correct digest signature with ::bytea casting

-- 1) Fix get_client_id_from_session
CREATE OR REPLACE FUNCTION public.get_client_id_from_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  client_uuid UUID;
  token_value TEXT;
BEGIN
  BEGIN
    token_value := current_setting('request.headers', true)::json ->> 'x-client-session';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF token_value IS NULL OR token_value = '' THEN
    RETURN NULL;
  END IF;

  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(token_value::bytea, 'sha256')
    AND cs.expires_at > now();

  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE token_hash = digest(token_value::bytea, 'sha256');
  END IF;

  RETURN client_uuid;
END;
$function$;

-- 2) Fix get_client_id_from_session_readonly
CREATE OR REPLACE FUNCTION public.get_client_id_from_session_readonly()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  client_uuid UUID;
  token_value TEXT;
  headers_raw TEXT;
BEGIN
  BEGIN
    headers_raw := current_setting('request.headers', true);
    IF headers_raw IS NOT NULL AND headers_raw != '' THEN
      token_value := headers_raw::json ->> 'x-client-session';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    token_value := NULL;
  END;

  IF token_value IS NULL OR token_value = '' THEN
    RETURN NULL;
  END IF;

  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(token_value::bytea, 'sha256')
    AND cs.expires_at > now();

  RETURN client_uuid;
END;
$function$;

-- 3) Fix authenticate_client_request
CREATE OR REPLACE FUNCTION public.authenticate_client_request(client_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  client_uuid UUID;
BEGIN
  -- Find valid session by token hash
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.token_hash = digest(client_session_token::bytea, 'sha256')
    AND cs.expires_at > now();

  -- Update last_used_at if found
  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE token_hash = digest(client_session_token::bytea, 'sha256');
  END IF;
  
  RETURN client_uuid;
END;
$function$;