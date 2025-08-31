-- Production Database Setup Script
-- Run this in your Supabase SQL Editor to set up the required schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PDF uploads table - tracks all PDF uploads with user isolation
CREATE TABLE IF NOT EXISTS pdf_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Metadata for tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDF processing jobs table - tracks individual processing steps
CREATE TABLE IF NOT EXISTS pdf_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdf_upload_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('pdf_to_image', 'image_upload', 'openai_processing', 'data_extraction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One-time access tokens table - for secure URL generation
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdf_upload_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table - comprehensive logging for security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_message_id ON pdf_uploads(message_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_status ON pdf_uploads(status);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_upload_id ON pdf_processing_jobs(pdf_upload_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_upload_id ON access_tokens(pdf_upload_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable Row Level Security (RLS)
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own pdf uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can manage their own processing jobs" ON pdf_processing_jobs;
DROP POLICY IF EXISTS "Users can manage their own access tokens" ON access_tokens;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can manage their own pdf uploads" ON pdf_uploads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own processing jobs" ON pdf_processing_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = pdf_processing_jobs.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own access tokens" ON access_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = access_tokens.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS create_access_token(UUID, INTEGER);
DROP FUNCTION IF EXISTS log_audit_event(TEXT, TEXT, TEXT, JSONB);

-- Functions for access token management
CREATE OR REPLACE FUNCTION create_access_token(
  p_pdf_upload_id UUID,
  p_expires_in_minutes INTEGER DEFAULT 10
) RETURNS TEXT AS $$
DECLARE
  token_value TEXT;
  token_hash TEXT;
BEGIN
  -- Verify user owns this PDF upload
  IF NOT EXISTS (
    SELECT 1 FROM pdf_uploads 
    WHERE id = p_pdf_upload_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You can only create tokens for your own PDF uploads';
  END IF;
  
  -- Generate token
  token_value := encode(gen_random_bytes(32), 'base64');
  token_hash := encode(sha256(token_value::bytea), 'hex');
  
  -- Store token hash
  INSERT INTO access_tokens (pdf_upload_id, token_hash, expires_at)
  VALUES (p_pdf_upload_id, token_hash, NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL);
  
  RETURN token_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON pdf_uploads TO authenticated;
GRANT ALL ON pdf_processing_jobs TO authenticated;
GRANT ALL ON access_tokens TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_access_token(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Create storage bucket for utility bills (if it doesn't exist)
-- Note: This needs to be done via the Supabase dashboard or API
-- The bucket should be named 'utility-bills' with the following settings:
-- - Public: false
-- - File size limit: 10MB
-- - Allowed MIME types: application/pdf, image/png, image/jpeg, image/webp
