-- Create storage policies for the utility-bills bucket
-- This enables authenticated users to upload and access their PDF images

-- Note: Storage policies are handled automatically by Supabase
-- The utility-bills bucket will allow authenticated users to upload files
-- based on the bucket configuration and RLS policies

-- Create function to generate signed URLs for utility-bills
-- This function validates that the user has access to the file before generating a URL
CREATE OR REPLACE FUNCTION generate_utility_bill_url(
  p_file_path TEXT,
  p_expires_in_seconds INTEGER DEFAULT 3600
) RETURNS TEXT AS $$
DECLARE
  user_folder TEXT;
  signed_url TEXT;
BEGIN
  -- Extract user folder from file path
  user_folder := split_part(p_file_path, '/', 1);
  
  -- Verify the user has access to this file
  IF user_folder != auth.uid()::text THEN
    RAISE EXCEPTION 'Access denied: You can only access your own files';
  END IF;
  
  -- Generate signed URL
  SELECT storage.create_signed_url('utility-bills', p_file_path, p_expires_in_seconds) INTO signed_url;
  
  RETURN signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the signed URL function
GRANT EXECUTE ON FUNCTION generate_utility_bill_url(TEXT, INTEGER) TO authenticated;
