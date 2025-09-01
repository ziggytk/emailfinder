-- Clear all bill extraction data from Supabase
-- This will remove all extracted bills and start fresh

-- Delete all bill extractions for all users
DELETE FROM bill_extractions;

-- Reset the sequence (if using auto-increment IDs)
-- ALTER SEQUENCE bill_extractions_id_seq RESTART WITH 1;

-- Verify the table is empty
SELECT COUNT(*) as remaining_bills FROM bill_extractions;

-- Optional: Also clear PDF uploads and processing jobs
-- DELETE FROM pdf_processing_jobs;
-- DELETE FROM pdf_uploads;
-- DELETE FROM access_tokens;

-- Optional: Clear audit logs related to bill processing
-- DELETE FROM audit_logs WHERE action LIKE '%bill%' OR action LIKE '%extraction%';
