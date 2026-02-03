-- Create 'concierge' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('concierge', 'concierge', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
DROP POLICY IF EXISTS "Public Concierge Read" ON storage.objects;
CREATE POLICY "Public Concierge Read" ON storage.objects
  FOR SELECT USING (bucket_id = 'concierge');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated Concierge Upload" ON storage.objects;
CREATE POLICY "Authenticated Concierge Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'concierge' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update images
DROP POLICY IF EXISTS "Authenticated Concierge Update" ON storage.objects;
CREATE POLICY "Authenticated Concierge Update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'concierge' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete images
DROP POLICY IF EXISTS "Authenticated Concierge Delete" ON storage.objects;
CREATE POLICY "Authenticated Concierge Delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'concierge' 
    AND auth.role() = 'authenticated'
  );
