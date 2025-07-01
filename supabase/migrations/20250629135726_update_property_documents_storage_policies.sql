
-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to upload property documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own property documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own property documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own property documents" ON storage.objects;

-- Create more permissive policies that allow client uploads
CREATE POLICY "Allow property document uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-documents'
);

-- Allow viewing of property documents for authenticated users and service role
CREATE POLICY "Allow property document access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-documents' AND
  (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Allow updates for authenticated users and service role
CREATE POLICY "Allow property document updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-documents' AND
  (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Allow deletes for authenticated users and service role
CREATE POLICY "Allow property document deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-documents' AND
  (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);
