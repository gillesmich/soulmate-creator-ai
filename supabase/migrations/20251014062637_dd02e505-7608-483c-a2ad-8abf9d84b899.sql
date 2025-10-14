-- Make girlfriend-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'girlfriend-images';