-- Grant permissions for anonymous users to use PDF processing functions
-- This allows users who sign in anonymously to upload and process PDFs

-- Grant execute permissions on functions to authenticated users (including anonymous)
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_access_token(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_access_token(TEXT) TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT, INSERT, UPDATE ON pdf_uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pdf_processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON access_tokens TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Grant usage on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Note: Storage bucket permissions are handled by RLS policies in the bucket setup
-- The utility-bills bucket should allow authenticated users to upload files 