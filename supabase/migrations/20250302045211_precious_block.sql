-- Create storage bucket for modules
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-files', 'module-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'module-files');

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'module-files');

CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'module-files');

CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'module-files');