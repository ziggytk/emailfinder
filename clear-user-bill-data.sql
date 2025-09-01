-- Clear bill extraction data for the current user only
-- Replace 'your-user-id-here' with your actual user ID

-- First, find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then delete bill extractions for that user
DELETE FROM bill_extractions 
WHERE user_id = 'your-user-id-here';

-- Verify the deletion
SELECT COUNT(*) as remaining_bills 
FROM bill_extractions 
WHERE user_id = 'your-user-id-here';

-- Optional: Clear other user-specific data
-- DELETE FROM pdf_uploads WHERE user_id = 'your-user-id-here';
-- DELETE FROM pdf_processing_jobs WHERE pdf_upload_id IN (
--   SELECT id FROM pdf_uploads WHERE user_id = 'your-user-id-here'
-- );
