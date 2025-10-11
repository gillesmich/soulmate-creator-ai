-- Add a new column to store multiple image URLs
ALTER TABLE saved_girlfriend_images 
ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb;

-- Update existing records to move single image_url to image_urls array
UPDATE saved_girlfriend_images 
SET image_urls = jsonb_build_array(image_url)
WHERE image_urls = '[]'::jsonb AND image_url IS NOT NULL;