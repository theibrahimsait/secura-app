-- Complete the submission updates system with storage policies and read tracking

-- Add is_read column to track message read status
ALTER TABLE public.submission_updates 
ADD COLUMN is_read BOOLEAN DEFAULT FALSE;

-- Create index for read status queries
CREATE INDEX idx_submission_updates_is_read ON public.submission_updates(is_read, created_at);

-- Create storage policies for submission update files
-- Files will be stored in: submissions/{submission_id}/updates/{filename}

CREATE POLICY "Agency staff can upload submission update files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-documents'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (
    -- Check if the submission belongs to this agency/agent
    (storage.foldername(name))[2]::uuid IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
      AND (
        (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
        (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()) 
         AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
      )
    )
  )
);

CREATE POLICY "Agency staff can access submission update files"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-documents'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (
    -- Check if the submission belongs to this agency/agent
    (storage.foldername(name))[2]::uuid IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
      AND (
        (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
        (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()) 
         AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
      )
    )
  )
);

CREATE POLICY "Clients can upload submission update files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-documents'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (
    -- Check if the submission belongs to this client
    (storage.foldername(name))[2]::uuid IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    )
  )
);

CREATE POLICY "Clients can access submission update files"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-documents'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (
    -- Check if the submission belongs to this client
    (storage.foldername(name))[2]::uuid IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    )
  )
);

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_submission_updates_as_read(
  p_submission_id UUID,
  p_user_role TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
  current_user_id UUID;
  current_client_id UUID;
BEGIN
  -- Get current user context
  IF p_user_role = 'client' THEN
    current_client_id := get_client_id_from_session_readonly();
    IF current_client_id IS NULL THEN
      RAISE EXCEPTION 'Client not authorized';
    END IF;
  ELSE
    -- For agency staff, get user ID from auth
    SELECT id INTO current_user_id 
    FROM users 
    WHERE auth_user_id = auth.uid();
    
    IF current_user_id IS NULL THEN
      RAISE EXCEPTION 'User not found';
    END IF;
  END IF;

  -- Mark messages as read based on user type
  IF p_user_role = 'client' THEN
    -- Client marks agency messages as read
    UPDATE submission_updates 
    SET is_read = TRUE
    WHERE submission_id = p_submission_id
      AND is_read = FALSE
      AND sender_role IN ('admin', 'agent')
      AND submission_id IN (
        SELECT pas.id 
        FROM property_agency_submissions pas
        WHERE is_client_authorized(pas.client_id)
      );
  ELSE
    -- Agency staff marks client messages as read
    UPDATE submission_updates 
    SET is_read = TRUE
    WHERE submission_id = p_submission_id
      AND is_read = FALSE
      AND sender_role = 'client'
      AND submission_id IN (
        SELECT pas.id 
        FROM property_agency_submissions pas
        WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
        AND (
          (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
          (pas.agent_id = current_user_id AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
        )
      );
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to get unread message counts per submission
CREATE OR REPLACE FUNCTION public.get_unread_submission_counts()
RETURNS TABLE (
  submission_id UUID,
  unread_count BIGINT,
  latest_message_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_client_id UUID;
  is_client BOOLEAN := FALSE;
BEGIN
  -- Determine if this is a client or agency staff
  current_client_id := get_client_id_from_session_readonly();
  
  IF current_client_id IS NOT NULL THEN
    is_client := TRUE;
  ELSE
    -- Get agency staff user ID
    SELECT id INTO current_user_id 
    FROM users 
    WHERE auth_user_id = auth.uid();
    
    IF current_user_id IS NULL THEN
      RAISE EXCEPTION 'User not found';
    END IF;
  END IF;

  -- Return unread counts based on user type
  IF is_client THEN
    -- For clients: count unread messages from agency staff
    RETURN QUERY
    SELECT 
      su.submission_id,
      COUNT(*) FILTER (WHERE NOT su.is_read AND su.sender_role IN ('admin', 'agent')) as unread_count,
      MAX(su.created_at) as latest_message_at
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE is_client_authorized(pas.client_id)
    GROUP BY su.submission_id;
  ELSE
    -- For agency staff: count unread messages from clients
    RETURN QUERY
    SELECT 
      su.submission_id,
      COUNT(*) FILTER (WHERE NOT su.is_read AND su.sender_role = 'client') as unread_count,
      MAX(su.created_at) as latest_message_at
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
      (pas.agent_id = current_user_id AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
    )
    GROUP BY su.submission_id;
  END IF;
END;
$$;