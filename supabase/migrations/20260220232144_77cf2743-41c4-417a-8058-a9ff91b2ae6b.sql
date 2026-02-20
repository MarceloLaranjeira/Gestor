
-- Create storage bucket for agent file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-uploads', 'agent-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload files
CREATE POLICY "Authenticated users can upload agent files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'agent-uploads' AND auth.uid() IS NOT NULL);

-- Policy: authenticated users can read their own files
CREATE POLICY "Authenticated users can read agent files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'agent-uploads' AND auth.uid() IS NOT NULL);

-- Policy: authenticated users can delete their own files
CREATE POLICY "Authenticated users can delete agent files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'agent-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
