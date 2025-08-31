-- Aggressive Ownership Fix for Supabase
-- This script addresses the most common causes of "must be owner of table objects" errors

-- IMPORTANT: Run this as the postgres user (admin) in Supabase SQL Editor

-- 1. First, let's ensure we're running as the right user
DO $$
BEGIN
  IF current_user != 'postgres' THEN
    RAISE EXCEPTION 'This script must be run as postgres user';
  END IF;
END $$;

-- 2. Grant schema usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- 3. Grant all privileges on all tables to authenticated users
-- This is the most common fix for ownership issues
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO authenticated;

-- 4. Grant all privileges on all sequences to authenticated users
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Grant all privileges on all functions to authenticated users
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 6. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- 7. Explicitly grant permissions on specific tables (if they exist)
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO authenticated', table_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO postgres', table_name);
    END LOOP;
END $$;

-- 8. Explicitly grant permissions on specific sequences (if they exist)
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO authenticated', seq_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO postgres', seq_name);
    END LOOP;
END $$;

-- 9. Explicitly grant permissions on specific functions (if they exist)
DO $$
DECLARE
    func_record record;
BEGIN
    FOR func_record IN 
        SELECT p.proname as func_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', 
                      func_record.func_name, func_record.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO postgres', 
                      func_record.func_name, func_record.args);
    END LOOP;
END $$;

-- 10. Ensure all tables are owned by postgres
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tableowner != 'postgres'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO postgres', table_name);
    END LOOP;
END $$;

-- 11. Ensure all sequences are owned by postgres
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO postgres', seq_name);
    END LOOP;
END $$;

-- 12. Ensure all functions are owned by postgres
DO $$
DECLARE
    func_record record;
BEGIN
    FOR func_record IN 
        SELECT p.proname as func_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proowner != (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO postgres', 
                      func_record.func_name, func_record.args);
    END LOOP;
END $$;

-- 13. Grant storage permissions
GRANT ALL PRIVILEGES ON storage.objects TO authenticated;
GRANT ALL PRIVILEGES ON storage.buckets TO authenticated;

-- 14. Create storage bucket if it doesn't exist
-- Note: This might fail if the bucket already exists, which is fine
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('utility-bills', 'utility-bills', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 15. Drop and recreate storage policies to ensure they work
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

-- 16. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 17. Verify the fix worked
SELECT 
  'Tables owned by postgres:' as check_type,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public' AND tableowner = 'postgres'

UNION ALL

SELECT 
  'Tables with authenticated permissions:' as check_type,
  COUNT(*) as count
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND grantee = 'authenticated' 
  AND privilege_type = 'ALL';

-- 18. Show final status
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity
FROM pg_tables 
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename;
