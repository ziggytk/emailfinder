-- Fix Storage Permissions for Production Supabase
-- Run this in your Supabase SQL Editor to allow authenticated users to access storage

-- Grant storage permissions to authenticated users
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Create storage policies for the utility-bills bucket
-- Allow authenticated users to upload to utility-bills bucket
CREATE POLICY "Allow authenticated uploads to utility-bills" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to view files in utility-bills bucket
CREATE POLICY "Allow authenticated reads from utility-bills" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update files in utility-bills bucket
CREATE POLICY "Allow authenticated updates to utility-bills" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files in utility-bills bucket
CREATE POLICY "Allow authenticated deletes from utility-bills" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Note: These are permissive policies for development/testing
-- In production, you might want more restrictive policies based on user ownership
