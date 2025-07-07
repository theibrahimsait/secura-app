-- Now that downloads work, let's restore proper RLS policies and fix uploads

-- Drop debug policies
DROP POLICY IF EXISTS "Debug client file access" ON storage.objects;
DROP POLICY IF EXISTS "Agency file access debug" ON storage.objects;

-- Create proper client download policy
CREATE POLICY "Clients can download submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id
    FROM property_agency_submissions pas
    WHERE pas.client_id = get_client_id_from_session_readonly()
  )
);

-- Create proper agency download policy  
CREATE POLICY "Agency can download submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id
    FROM property_agency_submissions pas
    WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
      OR (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
          AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agent')
    )
  )
);

-- Fix client upload policy - this was likely the issue
DROP POLICY IF EXISTS "Clients can upload their submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload submission update files" ON storage.objects;

CREATE POLICY "Clients can upload submission files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id
    FROM property_agency_submissions pas
    WHERE pas.client_id = get_client_id_from_session_readonly()
  )
);