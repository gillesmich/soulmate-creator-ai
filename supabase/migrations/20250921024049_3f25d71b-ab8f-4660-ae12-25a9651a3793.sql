-- Create storage bucket for saved girlfriend images
INSERT INTO storage.buckets (id, name, public) VALUES ('girlfriend-images', 'girlfriend-images', true);

-- Create RLS policies for girlfriend images bucket
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'girlfriend-images');

CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'girlfriend-images');

CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (bucket_id = 'girlfriend-images');

-- Create table to store saved girlfriend images metadata
CREATE TABLE public.saved_girlfriend_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  character_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on saved images table
ALTER TABLE public.saved_girlfriend_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for saved images
CREATE POLICY "Allow public read access to saved images" ON public.saved_girlfriend_images
FOR SELECT USING (true);

CREATE POLICY "Allow public insert to saved images" ON public.saved_girlfriend_images
FOR INSERT WITH CHECK (true);