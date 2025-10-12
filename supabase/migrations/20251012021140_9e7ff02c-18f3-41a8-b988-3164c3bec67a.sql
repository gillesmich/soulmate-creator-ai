-- Rendre le bucket girlfriend-images public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'girlfriend-images';

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Créer une politique pour permettre à tout le monde de voir les images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'girlfriend-images');