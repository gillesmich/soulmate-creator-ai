-- 1. Clean up NULL user_id records
DELETE FROM saved_girlfriend_images WHERE user_id IS NULL;

-- 2. Make user_id NOT NULL and add foreign key
ALTER TABLE saved_girlfriend_images 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE saved_girlfriend_images
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. Make girlfriend-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'girlfriend-images';

-- 4. Add RLS policies for storage
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'girlfriend-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'girlfriend-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'girlfriend-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'girlfriend-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);