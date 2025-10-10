-- Secure storage bucket policies for girlfriend-images
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;

-- Users can only upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'girlfriend-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only read their own images
CREATE POLICY "Users can read own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'girlfriend-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'girlfriend-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own images
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'girlfriend-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);