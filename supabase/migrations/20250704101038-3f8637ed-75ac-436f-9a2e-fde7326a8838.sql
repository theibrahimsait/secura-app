-- Create client session tokens for authentication
CREATE TABLE IF NOT EXISTS public.client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on client_sessions
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- Allow clients to access their own sessions
CREATE POLICY "Clients can access own sessions"
ON public.client_sessions
FOR ALL
USING (true);

-- Create function to get client ID from session token
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
  session_token := current_setting('request.headers', true)::json ->> 'authorization';
  
  -- Remove 'Bearer ' prefix if present
  IF session_token LIKE 'Bearer %' THEN
    session_token := substring(session_token from 8);
  END IF;
  
  -- Find client ID from valid session
  SELECT cs.client_id INTO client_uuid
  FROM public.client_sessions cs
  WHERE cs.session_token = session_token
    AND cs.expires_at > now();
    
  -- Update last_used_at
  IF client_uuid IS NOT NULL THEN
    UPDATE public.client_sessions 
    SET last_used_at = now()
    WHERE session_token = session_token;
  END IF;
  
  RETURN client_uuid;
END;
$$;

-- Update submissions policies to use session-based authentication
DROP POLICY IF EXISTS "Clients can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can view their own submissions" ON public.submissions;

CREATE POLICY "Clients can create their own submissions"
ON public.submissions
FOR INSERT
WITH CHECK (client_id = public.get_client_id_from_session());

CREATE POLICY "Clients can view their own submissions"
ON public.submissions
FOR SELECT
USING (client_id = public.get_client_id_from_session());

-- Update submission_properties policies
DROP POLICY IF EXISTS "Clients can create their submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Clients can view their submission properties" ON public.submission_properties;

CREATE POLICY "Clients can create their submission properties"
ON public.submission_properties
FOR INSERT
WITH CHECK (
  submission_id IN (
    SELECT s.id FROM public.submissions s
    WHERE s.client_id = public.get_client_id_from_session()
  )
);

CREATE POLICY "Clients can view their submission properties"
ON public.submission_properties
FOR SELECT
USING (
  submission_id IN (
    SELECT s.id FROM public.submissions s
    WHERE s.client_id = public.get_client_id_from_session()
  )
);