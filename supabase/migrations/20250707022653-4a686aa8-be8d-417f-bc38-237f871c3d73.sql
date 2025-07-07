-- Temporarily create a more permissive policy for debugging client downloads
-- This will help us understand what's blocking the download

-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Client submission file access v2" ON storage.objects;
DROP POLICY IF EXISTS "Agency submission file access v2" ON storage.objects;

-- Create a temporary debug policy that's very permissive for the specific file
CREATE POLICY "Debug client file access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-updates'
  AND name LIKE '%68b81034-ac6c-435e-a7ec-18d1b2f60e0a%'
);

-- Also recreate agency access
CREATE POLICY "Agency file access debug"
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