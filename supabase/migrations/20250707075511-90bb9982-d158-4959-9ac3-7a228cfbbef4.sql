-- Create a function to handle secure file downloads for clients
CREATE OR REPLACE FUNCTION public.get_client_file_download_url(
  p_client_session_token TEXT,
  p_file_path TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requesting_client_id UUID;
  submission_uuid UUID;
  file_url TEXT;
BEGIN
  -- Get client ID from session token
  SELECT cs.client_id INTO requesting_client_id
  FROM public.client_sessions cs
  WHERE cs.session_token = p_client_session_token
    AND cs.expires_at > now();
    
  -- Return null if no valid session
  IF requesting_client_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract submission ID from file path (submissions/{submission_id}/updates/{filename})
  submission_uuid := (string_to_array(p_file_path, '/'))[2]::UUID;
  
  -- Check if client has access to this submission file
  IF NOT EXISTS (
    SELECT 1 FROM property_agency_submissions pas
    WHERE pas.id = submission_uuid 
    AND pas.client_id = requesting_client_id
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Generate signed URL for the file (valid for 1 hour)
  SELECT storage.get_presigned_url('submission-updates', p_file_path, 3600) INTO file_url;
  
  RETURN file_url;
END;
$$;