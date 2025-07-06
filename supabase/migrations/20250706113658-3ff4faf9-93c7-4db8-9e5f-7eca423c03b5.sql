-- Fix storage policies for submission update file uploads

-- Drop the incorrect policies
DROP POLICY IF EXISTS "Agency staff can upload submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload submission update files" ON storage.objects;

-- Create correct policies for the submission-updates bucket
CREATE POLICY "Agency staff can upload submission update files"
ON storage.objects FOR INSERT
WITH CHECK (
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

CREATE POLICY "Clients can upload submission update files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id
    FROM property_agency_submissions pas
    WHERE is_client_authorized(pas.client_id)
  )
);