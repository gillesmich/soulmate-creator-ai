-- Add user_id column to track ownership
ALTER TABLE public.saved_girlfriend_images 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing public policies
DROP POLICY IF EXISTS "Allow public insert to saved images" ON public.saved_girlfriend_images;
DROP POLICY IF EXISTS "Allow public read access to saved images" ON public.saved_girlfriend_images;

-- Create secure RLS policies
CREATE POLICY "Users can view their own saved images"
ON public.saved_girlfriend_images
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved images"
ON public.saved_girlfriend_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved images"
ON public.saved_girlfriend_images
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved images"
ON public.saved_girlfriend_images
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);