
-- Create the property-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload property documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-documents' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to view their own files
CREATE POLICY "Allow users to view their own property documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-documents' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to update their own files
CREATE POLICY "Allow users to update their own property documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-documents' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Allow users to delete their own property documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-documents' AND
  auth.role() = 'authenticated'
);
