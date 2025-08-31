-- Fix Storage Bucket and Policies
-- Run this in your Supabase SQL Editor to resolve storage upload issues

-- 1. First, let's check what storage buckets exist
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY name;

-- 2. Create the utility-bills bucket if it doesn't exist
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
) VALUES (
  'utility-bills',
  'utility-bills',
  false, -- private bucket
  10485760, -- 10MB file size limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Grant storage permissions to authenticated users
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL PRIVILEGES ON storage.objects TO authenticated;
GRANT ALL PRIVILEGES ON storage.buckets TO authenticated;

-- 4. Drop any existing storage policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated uploads to utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from utility-bills" ON storage.objects;

-- 5. Create storage policies for utility-bills bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to utility-bills" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads from utility-bills" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates to utility-bills" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from utility-bills" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- 6. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. Verify the bucket and policies are created
SELECT 
  'Bucket Info' as info_type,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'utility-bills'

UNION ALL

SELECT 
  'Policy Info' as info_type,
  policyname as id,
  tablename as name,
  permissive::text as public,
  cmd as file_size_limit,
  qual as allowed_mime_types
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%utility-bills%';

-- 8. Test if we can access the bucket
SELECT 
  'Storage Access Test' as test_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets 
      WHERE name = 'utility-bills'
    ) THEN 'Bucket exists'
    ELSE 'Bucket missing'
  END as result;
