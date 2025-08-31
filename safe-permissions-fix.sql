-- Safe Permissions and RLS Policy Fix
-- Run this in your Supabase SQL Editor to fix 403 errors safely

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

-- STEP 3: Drop ALL existing RLS policies safely
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on public schema tables
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
    
    -- Drop all policies on storage.objects
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- STEP 4: Create or update the utility-bills storage bucket
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

-- STEP 5: Create RLS policies safely (only if table exists)
DO $$
BEGIN
    -- PDF uploads policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_uploads') THEN
        CREATE POLICY "Users can manage their own PDF uploads" ON pdf_uploads
          FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- PDF processing jobs policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_processing_jobs') THEN
        CREATE POLICY "Users can manage their own processing jobs" ON pdf_processing_jobs
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM pdf_uploads 
              WHERE pdf_uploads.id = pdf_processing_jobs.pdf_upload_id 
              AND pdf_uploads.user_id = auth.uid()
            )
          );
    END IF;
    
    -- Access tokens policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_tokens') THEN
        CREATE POLICY "Users can manage their own access tokens" ON access_tokens
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM pdf_uploads 
              WHERE pdf_uploads.id = access_tokens.pdf_upload_id 
              AND pdf_uploads.user_id = auth.uid()
            )
          );
    END IF;
    
    -- Audit logs policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE POLICY "Users can read their own audit logs" ON audit_logs
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Properties policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
        CREATE POLICY "Users can manage their own properties" ON properties
          FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Utility providers policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'utility_providers') THEN
        CREATE POLICY "Users can read utility providers" ON utility_providers
          FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    -- Property utility accounts policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_utility_accounts') THEN
        CREATE POLICY "Users can manage their own utility accounts" ON property_utility_accounts
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = property_utility_accounts.property_id 
              AND properties.user_id = auth.uid()
            )
          );
    END IF;
    
    -- Utility bills policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'utility_bills') THEN
        CREATE POLICY "Users can manage their own utility bills" ON utility_bills
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM property_utility_accounts pua
              JOIN properties p ON p.id = pua.property_id
              WHERE pua.id = utility_bills.property_utility_account_id 
              AND p.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- STEP 6: Create storage policies safely
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

-- STEP 7: Enable RLS on all tables safely
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('pdf_uploads', 'pdf_processing_jobs', 'access_tokens', 'audit_logs', 'properties', 'utility_providers', 'property_utility_accounts', 'utility_bills')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    END LOOP;
END $$;

-- Enable RLS on storage.objects
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
