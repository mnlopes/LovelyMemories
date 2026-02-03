-- SQL to setup Supabase Storage for Property Images
-- This creates the 'properties' bucket and sets up public access policies.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read images
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'properties');

-- 3. Allow authenticated users (Admin) to upload images
CREATE POLICY "Authenticated Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'properties' 
    AND auth.role() = 'authenticated'
  );

-- 4. Allow authenticated users (Admin) to delete images
CREATE POLICY "Authenticated Delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'properties' 
    AND auth.role() = 'authenticated'
  );
