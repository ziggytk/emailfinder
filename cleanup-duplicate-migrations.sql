-- Cleanup Duplicate Migrations
-- Run this to clean up any duplicate table definitions and ensure clean schema

-- First, let's check what tables actually exist
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for any duplicate table definitions or conflicts
-- If there are issues, we can drop and recreate the problematic tables

-- Note: Only run the DROP statements if you're sure you want to recreate the tables
-- This will delete all data in those tables

-- Uncomment the following lines only if you need to completely reset the schema:

/*
-- Drop Property Analytics tables (if they exist and are causing conflicts)
DROP TABLE IF EXISTS utility_bills CASCADE;
DROP TABLE IF EXISTS property_utility_accounts CASCADE;
DROP TABLE IF EXISTS utility_providers CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- Drop PDF processing tables (if they exist and are causing conflicts)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS access_tokens CASCADE;
DROP TABLE IF EXISTS pdf_processing_jobs CASCADE;
DROP TABLE IF EXISTS pdf_uploads CASCADE;

-- Drop views (if they exist)
DROP VIEW IF EXISTS property_comparison CASCADE;
DROP VIEW IF EXISTS monthly_usage_summary CASCADE;

-- Drop functions (if they exist)
DROP FUNCTION IF EXISTS get_property_analytics(UUID, DATE, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_utility_bill(UUID, DATE, DECIMAL, DECIMAL, TEXT, DATE, DATE, TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS add_utility_account(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_property(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS validate_access_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_access_token(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, JSONB) CASCADE;
*/

-- Instead of dropping, let's try to fix the existing tables
-- This is safer as it preserves data

-- Check for any constraint violations or orphaned references
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Check for any invalid indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE '%idx_%'
ORDER BY tablename, indexname;

-- Verify that all foreign key references are valid
-- This will help identify any broken relationships
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
