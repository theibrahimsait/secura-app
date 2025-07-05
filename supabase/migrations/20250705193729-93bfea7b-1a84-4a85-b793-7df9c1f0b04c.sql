-- Update storage policies for property-documents bucket to allow unauthenticated uploads
-- since clients use custom session tokens, not JWT auth

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow property document access" ON storage.objects;
DROP POLICY IF EXISTS "Allow property document uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow property document updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow property document deletes" ON storage.objects;

-- Create new permissive policies for property-documents bucket
-- Allow anyone to upload property documents (we'll control access via application logic)
CREATE POLICY "Allow property document uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'property-documents');

-- Allow property document access for authenticated users and service role
CREATE POLICY "Allow property document access" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'property-documents' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Allow updates and deletes for authenticated users and service role
CREATE POLICY "Allow property document updates" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'property-documents' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

CREATE POLICY "Allow property document deletes" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'property-documents' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);