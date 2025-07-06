-- Fix submission updates system storage and policies (corrected v2)

-- 1. Create dedicated storage bucket for submission updates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('submission-updates', 'submission-updates', false);

-- 2. Drop old storage policies if they exist
DROP POLICY IF EXISTS "Agency staff can access submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can access submission update files" ON storage.objects;

-- 3. Create proper storage policies for the new bucket
CREATE POLICY "Allow submission update uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (
    -- Agency staff can upload for their submissions
    (
      ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('agency_admin', 'agent'))
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT pas.id::text::uuid
        FROM property_agency_submissions pas
        WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
          OR pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
        )
      )
    )
    OR
    -- Clients can upload for their submissions
    (
      (storage.foldername(name))[2]::uuid IN (
        SELECT pas.id::text::uuid
        FROM property_agency_submissions pas
        WHERE is_client_authorized(pas.client_id)
      )
    )
  )
);

CREATE POLICY "Allow submission update downloads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (
    -- Agency staff can download from their submissions
    (
      ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('agency_admin', 'agent'))
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT pas.id::text::uuid
        FROM property_agency_submissions pas
        WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
          OR pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
        )
      )
    )
    OR
    -- Clients can download from their submissions
    (
      (storage.foldername(name))[2]::uuid IN (
        SELECT pas.id::text::uuid
        FROM property_agency_submissions pas
        WHERE is_client_authorized(pas.client_id)
      )
    )
  )
);

-- 4. Drop existing functions with correct signatures
DROP FUNCTION IF EXISTS public.mark_submission_updates_as_read(uuid, text);
DROP FUNCTION IF EXISTS public.mark_submission_updates_as_read(uuid);
DROP FUNCTION IF EXISTS public.get_unread_submission_counts(text);
DROP FUNCTION IF EXISTS public.get_unread_submission_counts();

-- 5. Create new simplified functions with auto-role detection
CREATE OR REPLACE FUNCTION public.mark_submission_updates_as_read(p_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_client_id uuid;
  user_role text;
BEGIN
  -- Auto-detect role from JWT
  user_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  
  IF user_role = 'client' OR user_role IS NULL THEN
    -- Client context
    current_client_id := get_client_id_from_session_readonly();
    IF current_client_id IS NULL THEN
      RAISE EXCEPTION 'Client not authenticated';
    END IF;
    
    -- Mark updates as read for this client
    UPDATE submission_updates 
    SET is_read = true
    WHERE submission_id = p_submission_id
    AND sender_role != 'client'  -- Don't mark own messages as read
    AND submission_id IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    );
    
  ELSE
    -- Agency staff context (admin/agent)
    SELECT users.id INTO current_user_id 
    FROM users 
    WHERE users.auth_user_id = auth.uid();
    
    IF current_user_id IS NULL THEN
      RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Mark updates as read for this user
    UPDATE submission_updates 
    SET is_read = true
    WHERE submission_id = p_submission_id
    AND sender_role = 'client'  -- Only mark client messages as read
    AND submission_id IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
      AND (
        user_role = 'agency_admin'
        OR pas.agent_id = current_user_id
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_submission_counts()
RETURNS TABLE(submission_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_client_id uuid;
  user_role text;
BEGIN
  -- Auto-detect role from JWT
  user_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  
  IF user_role = 'client' OR user_role IS NULL THEN
    -- Client context - count unread messages from agency staff
    current_client_id := get_client_id_from_session_readonly();
    IF current_client_id IS NULL THEN
      RAISE EXCEPTION 'Client not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
      su.submission_id,
      COUNT(*)::bigint as unread_count
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE is_client_authorized(pas.client_id)
    AND su.sender_role != 'client'  -- Messages from agency staff
    AND su.is_read = false
    GROUP BY su.submission_id;
    
  ELSE
    -- Agency staff context - count unread messages from clients
    SELECT users.id INTO current_user_id 
    FROM users 
    WHERE users.auth_user_id = auth.uid();
    
    IF current_user_id IS NULL THEN
      RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
      su.submission_id,
      COUNT(*)::bigint as unread_count
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (
      user_role = 'agency_admin'
      OR pas.agent_id = current_user_id
    )
    AND su.sender_role = 'client'  -- Messages from clients
    AND su.is_read = false
    GROUP BY su.submission_id;
  END IF;
END;
$$;