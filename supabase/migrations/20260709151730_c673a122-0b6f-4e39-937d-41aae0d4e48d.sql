
-- Add image column to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image text;

-- Storage policies for the "media" bucket
-- Anyone can view files (needed for product/post images)
CREATE POLICY "Public read media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Admins can upload/update/delete
CREATE POLICY "Admins can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
