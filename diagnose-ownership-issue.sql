-- Comprehensive Ownership Issue Diagnosis
-- Run this to identify the exact cause of the "must be owner of table objects" error

-- 1. Check current user and role
SELECT 
  current_user as current_user,
  session_user as session_user,
  current_setting('role') as current_role;

-- 2. Check which tables exist and their current ownership
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename;

-- 3. Check table permissions for authenticated role
SELECT 
  t.table_schema,
  t.table_name,
  p.privilege_type,
  p.is_grantable
FROM information_schema.tables t
LEFT JOIN information_schema.table_privileges p 
  ON t.table_name = p.table_name 
  AND t.table_schema = p.table_schema
WHERE t.table_schema = 'public'
  AND p.grantee = 'authenticated'
ORDER BY t.table_name, p.privilege_type;

-- 4. Check if RLS is causing issues
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Check for any broken foreign key references
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. Check if there are any schema-level permission issues
SELECT 
  schema_name,
  schema_owner
FROM information_schema.schemata
WHERE schema_name IN ('public', 'storage', 'auth');

-- 8. Check function permissions
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  p.proowner::regrole as owner,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 9. Check sequence permissions
SELECT 
  sequence_schema,
  sequence_name,
  sequence_owner
FROM information_schema.sequences
WHERE sequence_schema = 'public';

-- 10. Check for any orphaned objects
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
  AND tableowner NOT IN ('postgres', 'supabase_admin', 'authenticated')
ORDER BY tableowner, tablename;
