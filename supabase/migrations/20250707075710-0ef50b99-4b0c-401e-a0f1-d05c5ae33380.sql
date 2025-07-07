-- Create a function to handle secure file downloads for agency staff
CREATE OR REPLACE FUNCTION public.get_agency_file_download_url(
  p_file_path TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  submission_uuid UUID;
  user_role TEXT;
  file_url TEXT;
BEGIN
  -- Get current user and role from JWT
  user_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  SELECT users.id INTO current_user_id 
  FROM users 
  WHERE users.auth_user_id = auth.uid();
  
  -- Return null if user not found
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract submission ID from file path (submissions/{submission_id}/updates/{filename})
  submission_uuid := (string_to_array(p_file_path, '/'))[2]::UUID;
  
  -- Check if agency staff has access to this submission file
  IF NOT EXISTS (
    SELECT 1 FROM property_agency_submissions pas
    WHERE pas.id = submission_uuid 
    AND pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (
      user_role = 'agency_admin'
      OR pas.agent_id = current_user_id
    )
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Generate signed URL for the file (valid for 1 hour)
  SELECT storage.get_presigned_url('submission-updates', p_file_path, 3600) INTO file_url;
  
  RETURN file_url;
END;
$$;