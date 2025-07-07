-- Debug and fix client storage access for submission update files

-- First, let's check the current storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
AND policyname LIKE '%submission%';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Clients can download submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can download submission update files" ON storage.objects;

-- Create a more permissive client policy for debugging
CREATE POLICY "Clients can download their submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id::text::uuid
    FROM property_agency_submissions pas
    WHERE pas.client_id = get_client_id_from_session_readonly()
  )
);

-- Recreate agency staff policy 
CREATE POLICY "Agency staff can download submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[3] = 'updates'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id::text::uuid
    FROM property_agency_submissions pas
    WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
      OR (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
          AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agent')
    )
  )
);