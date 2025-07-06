-- Fix storage policy for client file downloads - correct path indexing

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Clients can download submission update files" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can download submission update files" ON storage.objects;

-- Create corrected policy for clients
-- Note: storage.foldername() uses 1-based indexing and splits on '/'
-- For path "submissions/uuid/updates/filename.pdf":
--   [1] = "submissions", [2] = "uuid", [3] = "updates", [4] = "filename.pdf"
CREATE POLICY "Clients can download submission update files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT pas.id
    FROM property_agency_submissions pas
    WHERE pas.client_id = get_client_id_from_session_readonly()
  )
  AND (storage.foldername(name))[3] = 'updates'
);

-- Recreate agency staff policy with correct indexing
CREATE POLICY "Agency staff can download submission update files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND (storage.foldername(name))[1] = 'submissions'
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
  AND (storage.foldername(name))[3] = 'updates'
);