-- Create PDF processing schema with audit logging
-- This handles the storage and processing of PDF utility bills

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PDF uploads table - tracks all PDF uploads with user isolation
CREATE TABLE pdf_uploads (
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
CREATE TABLE pdf_processing_jobs (
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
CREATE TABLE access_tokens (
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
CREATE TABLE audit_logs (
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

-- Indexes for performance
CREATE INDEX idx_pdf_uploads_user_id ON pdf_uploads(user_id);
CREATE INDEX idx_pdf_uploads_status ON pdf_uploads(status);
CREATE INDEX idx_pdf_uploads_created_at ON pdf_uploads(created_at);
CREATE INDEX idx_processing_jobs_pdf_upload_id ON pdf_processing_jobs(pdf_upload_id);
CREATE INDEX idx_processing_jobs_status ON pdf_processing_jobs(status);
CREATE INDEX idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX idx_access_tokens_expires_at ON access_tokens(expires_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own PDF uploads
CREATE POLICY "Users can only access their own PDF uploads" ON pdf_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access processing jobs for their own PDFs
CREATE POLICY "Users can only access their own processing jobs" ON pdf_processing_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = pdf_processing_jobs.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

-- Users can only access tokens for their own PDFs
CREATE POLICY "Users can only access their own access tokens" ON access_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pdf_uploads 
      WHERE pdf_uploads.id = access_tokens.pdf_upload_id 
      AND pdf_uploads.user_id = auth.uid()
    )
  );

-- Audit logs are read-only for users (admin can manage)
CREATE POLICY "Users can read their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Functions for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
  VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create one-time access token
CREATE OR REPLACE FUNCTION create_access_token(
  p_pdf_upload_id UUID,
  p_expires_in_minutes INTEGER DEFAULT 10
) RETURNS TEXT AS $$
DECLARE
  token_value TEXT;
  token_hash TEXT;
BEGIN
  -- Verify user owns the PDF
  IF NOT EXISTS (
    SELECT 1 FROM pdf_uploads 
    WHERE id = p_pdf_upload_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Generate secure token
  token_value := encode(gen_random_bytes(32), 'hex');
  token_hash := encode(sha256(token_value::bytea), 'hex');
  
  -- Store token hash
  INSERT INTO access_tokens (pdf_upload_id, token_hash, expires_at)
  VALUES (p_pdf_upload_id, token_hash, NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL);
  
  -- Log the token creation
  PERFORM log_audit_event('token_created', 'access_token', p_pdf_upload_id::TEXT);
  
  RETURN token_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and consume access token
CREATE OR REPLACE FUNCTION validate_access_token(p_token TEXT) RETURNS UUID AS $$
DECLARE
  token_hash TEXT;
  pdf_upload_id UUID;
BEGIN
  token_hash := encode(sha256(p_token::bytea), 'hex');
  
  -- Find and validate token
  SELECT at.pdf_upload_id INTO pdf_upload_id
  FROM access_tokens at
  WHERE at.token_hash = token_hash
    AND at.expires_at > NOW()
    AND at.used_at IS NULL;
  
  IF pdf_upload_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;
  
  -- Mark token as used
  UPDATE access_tokens 
  SET used_at = NOW()
  WHERE token_hash = token_hash;
  
  -- Log the token usage
  PERFORM log_audit_event('token_used', 'access_token', pdf_upload_id::TEXT);
  
  RETURN pdf_upload_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 