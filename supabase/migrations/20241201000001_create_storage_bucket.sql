-- Create storage bucket for PDF and image storage
-- This bucket will store both original PDFs and processed images

-- Create the utility-bills bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'utility-bills', 
  'utility-bills', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only upload to their own folder
CREATE POLICY "Users can only upload to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'utility-bills' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can only access their own files
CREATE POLICY "Users can only access their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'utility-bills' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can only update their own files
CREATE POLICY "Users can only update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'utility-bills' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can only delete their own files
CREATE POLICY "Users can only delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'utility-bills' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  ); 