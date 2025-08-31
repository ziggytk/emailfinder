-- Fix Ownership and Permission Issues
-- Run this in your Supabase SQL Editor to resolve the "must be owner of table objects" error

-- First, let's check what tables exist and their current ownership
-- This will help us understand the current state

-- Grant ownership of all tables to the postgres user (Supabase admin)
-- This ensures proper ownership for all operations

-- Fix PDF processing schema tables
ALTER TABLE IF EXISTS pdf_uploads OWNER TO postgres;
ALTER TABLE IF EXISTS pdf_processing_jobs OWNER TO postgres;
ALTER TABLE IF EXISTS access_tokens OWNER TO postgres;
ALTER TABLE IF EXISTS audit_logs OWNER TO postgres;

-- Fix Property Analytics schema tables
ALTER TABLE IF EXISTS properties OWNER TO postgres;
ALTER TABLE IF EXISTS utility_providers OWNER TO postgres;
ALTER TABLE IF EXISTS property_utility_accounts OWNER TO postgres;
ALTER TABLE IF EXISTS utility_bills OWNER TO postgres;

-- Grant proper permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on PDF processing tables
GRANT ALL ON pdf_uploads TO authenticated;
GRANT ALL ON pdf_processing_jobs TO authenticated;
GRANT ALL ON access_tokens TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Grant permissions on Property Analytics tables
GRANT ALL ON properties TO authenticated;
GRANT ALL ON utility_providers TO authenticated;
GRANT ALL ON property_utility_accounts TO authenticated;
GRANT ALL ON utility_bills TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on views
GRANT SELECT ON monthly_usage_summary TO authenticated;
GRANT SELECT ON property_comparison TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Fix storage permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Drop and recreate RLS policies to ensure they work properly
-- PDF processing tables
DROP POLICY IF EXISTS "Users can only access their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can only access their own processing jobs" ON pdf_processing_jobs;
DROP POLICY IF EXISTS "Users can only access their own access tokens" ON access_tokens;
DROP POLICY IF EXISTS "Users can read their own audit logs" ON audit_logs;

-- Property analytics tables
DROP POLICY IF EXISTS "Users can only access their own properties" ON properties;
DROP POLICY IF EXISTS "Users can read utility providers" ON utility_providers;
DROP POLICY IF EXISTS "Users can only access their own utility accounts" ON property_utility_accounts;
DROP POLICY IF EXISTS "Users can only access their own utility bills" ON utility_bills;

-- Recreate RLS policies with proper ownership
CREATE POLICY "Users can only access their own PDF uploads" ON pdf_uploads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own processing jobs" ON pdf_processing_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = pdf_processing_jobs.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can only access their own access tokens" ON access_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = access_tokens.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own properties" ON properties
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read utility providers" ON utility_providers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can only access their own utility accounts" ON property_utility_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = property_utility_accounts.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can only access their own utility bills" ON utility_bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM property_utility_accounts pua
      JOIN properties p ON p.id = pua.property_id
      WHERE pua.id = utility_bills.property_utility_account_id 
      AND p.user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on all tables
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_utility_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

-- Create storage policies for utility-bills bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to utility-bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from utility-bills" ON storage.objects;

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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Verify the setup by checking table ownership
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename;
