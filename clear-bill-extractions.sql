-- Clear all bill extractions for the current user
-- This will delete ALL bill extraction records from the database

-- Option 1: Delete all records (use this if you want to clear everything)
DELETE FROM bill_extractions;

-- Option 2: Delete only records for a specific user (uncomment and replace with your user ID if needed)
-- DELETE FROM bill_extractions WHERE user_id = 'your-user-id-here';

-- Verify the deletion
SELECT COUNT(*) as remaining_records FROM bill_extractions;
