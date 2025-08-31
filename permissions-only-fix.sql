-- Permissions and RLS Policy Fix Only
-- Run this in your Supabase SQL Editor to fix 403 errors without recreating tables

-- STEP 1: Grant all necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO authenticated;

-- Grant permissions on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on all functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- STEP 2: Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- STEP 3: Drop ALL existing RLS policies to start fresh
-- Database table policies
DROP POLICY IF EXISTS "Users can only access their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can only access their own processing jobs" ON pdf_processing_jobs;
DROP POLICY IF EXISTS "Users can only access their own access tokens" ON access_tokens;
DROP POLICY IF EXISTS "Users can read their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can only access their own properties" ON properties;
DROP POLICY IF EXISTS "Users can read utility providers" ON utility_providers;
DROP POLICY IF EXISTS "Users can only access their own utility accounts" ON property_utility_accounts;
DROP POLICY IF EXISTS "Users can only access their own utility bills" ON utility_bills;

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads to utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from utility-bills" ON storage.objects;

-- STEP 4: Create or update the utility-bills storage bucket (won't fail if exists)
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

-- STEP 5: Create permissive RLS policies for development
-- PDF uploads - allow authenticated users to manage their own uploads
CREATE POLICY "Users can manage their own PDF uploads" ON pdf_uploads
  FOR ALL USING (auth.uid() = user_id);

-- PDF processing jobs - allow access to jobs for user's own uploads
CREATE POLICY "Users can manage their own processing jobs" ON pdf_processing_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = pdf_processing_jobs.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

-- Access tokens - allow access to tokens for user's own uploads
CREATE POLICY "Users can manage their own access tokens" ON access_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = access_tokens.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

-- Audit logs - allow users to read their own logs
CREATE POLICY "Users can read their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Properties - allow users to manage their own properties
CREATE POLICY "Users can manage their own properties" ON properties
  FOR ALL USING (auth.uid() = user_id);

-- Utility providers - allow all authenticated users to read
CREATE POLICY "Users can read utility providers" ON utility_providers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Property utility accounts - allow access to accounts for user's own properties
CREATE POLICY "Users can manage their own utility accounts" ON property_utility_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = property_utility_accounts.property_id 
      AND properties.user_id = auth.uid()
    )
  );

-- Utility bills - allow access to bills for user's own utility accounts
CREATE POLICY "Users can manage their own utility bills" ON utility_bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM property_utility_accounts pua
      JOIN properties p ON p.id = pua.property_id
      WHERE pua.id = utility_bills.property_utility_account_id 
      AND p.user_id = auth.uid()
    )
  );

-- STEP 6: Create storage policies for utility-bills bucket
CREATE POLICY "Allow authenticated uploads to utility-bills" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated reads from utility-bills" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated updates to utility-bills" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated deletes from utility-bills" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'utility-bills' 
    AND auth.role() = 'authenticated'
  );

-- STEP 7: Enable RLS on all tables (won't fail if already enabled)
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_utility_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- STEP 8: Verify the setup
SELECT 
  'Database Tables with RLS' as category,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 
  'Storage Bucket' as category,
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
WHERE name = 'utility-bills';

SELECT 
  'Database Policies' as category,
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 
  'Storage Policies' as category,
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
