-- Create a direct function for clients to get their submission updates
CREATE OR REPLACE FUNCTION public.get_client_submission_updates(
  p_client_session_token TEXT,
  p_submission_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  submission_id UUID,
  sender_role TEXT,
  sender_id UUID,
  client_id UUID,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN,
  sender_name TEXT,
  attachments JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  requesting_client_id UUID;
BEGIN
  -- Get client ID from session token
  SELECT cs.client_id INTO requesting_client_id
  FROM public.client_sessions cs
  WHERE cs.session_token = p_client_session_token
    AND cs.expires_at > now();
    
  -- Return empty if no valid session
  IF requesting_client_id IS NULL THEN
    RAISE NOTICE '❌ Invalid or expired session token';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Valid client session for client_id: %', requesting_client_id;
  
  -- Return submission updates for this client's submissions
  RETURN QUERY
  SELECT 
    su.id,
    su.submission_id,
    su.sender_role,
    su.sender_id,
    su.client_id,
    su.message,
    su.created_at,
    su.is_read,
    COALESCE(u.full_name, c.full_name, 'Unknown') as sender_name,
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', sua.id,
          'file_name', sua.file_name,
          'file_path', sua.file_path,
          'file_size', sua.file_size,
          'mime_type', sua.mime_type,
          'uploaded_at', sua.uploaded_at
        )
      ) FROM submission_update_attachments sua WHERE sua.update_id = su.id),
      '[]'::json
    ) as attachments
  FROM submission_updates su
  JOIN property_agency_submissions pas ON su.submission_id = pas.id
  LEFT JOIN users u ON su.sender_id = u.id
  LEFT JOIN clients c ON su.client_id = c.id
  WHERE pas.client_id = requesting_client_id
    AND (p_submission_id IS NULL OR su.submission_id = p_submission_id)
  ORDER BY su.created_at ASC;
END;
$$;