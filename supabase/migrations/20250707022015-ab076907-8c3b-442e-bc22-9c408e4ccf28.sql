-- Fix client download access with unique policy names

-- Drop all existing submission-related storage policies
DROP POLICY IF EXISTS "Clients can download their submission files" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can download submission files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can download submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can download submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can view submission update files" ON storage.objects;

-- Create new client download policy with debugging-friendly access
CREATE POLICY "Client submission file access v2"
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

-- Recreate agency staff policy
CREATE POLICY "Agency submission file access v2"  
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