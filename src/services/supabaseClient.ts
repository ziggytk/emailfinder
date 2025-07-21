import { createClient } from '@supabase/supabase-js';

// For development, we'll use environment variables
// In production, these should be properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      pdf_uploads: {
        Row: {
          id: string;
          user_id: string;
          message_id: string;
          provider_id: string;
          original_filename: string;
          file_size: number;
          file_path: string;
          status: 'uploaded' | 'processing' | 'completed' | 'failed';
          uploaded_at: string;
          processed_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message_id: string;
          provider_id: string;
          original_filename: string;
          file_size: number;
          file_path: string;
          status?: 'uploaded' | 'processing' | 'completed' | 'failed';
          uploaded_at?: string;
          processed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message_id?: string;
          provider_id?: string;
          original_filename?: string;
          file_size?: number;
          file_path?: string;
          status?: 'uploaded' | 'processing' | 'completed' | 'failed';
          uploaded_at?: string;
          processed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pdf_processing_jobs: {
        Row: {
          id: string;
          pdf_upload_id: string;
          job_type: 'pdf_to_image' | 'image_upload' | 'openai_processing' | 'data_extraction';
          status: 'pending' | 'running' | 'completed' | 'failed';
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          pdf_upload_id: string;
          job_type: 'pdf_to_image' | 'image_upload' | 'openai_processing' | 'data_extraction';
          status?: 'pending' | 'running' | 'completed' | 'failed';
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          pdf_upload_id?: string;
          job_type?: 'pdf_to_image' | 'image_upload' | 'openai_processing' | 'data_extraction';
          status?: 'pending' | 'running' | 'completed' | 'failed';
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          metadata?: any;
          created_at?: string;
        };
      };
      access_tokens: {
        Row: {
          id: string;
          pdf_upload_id: string;
          token_hash: string;
          expires_at: string;
          used_at: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pdf_upload_id: string;
          token_hash: string;
          expires_at: string;
          used_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pdf_upload_id?: string;
          token_hash?: string;
          expires_at?: string;
          used_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: any;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          details?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      log_audit_event: {
        Args: {
          p_action: string;
          p_resource_type: string;
          p_resource_id?: string;
          p_details?: any;
        };
        Returns: string;
      };
      create_access_token: {
        Args: {
          p_pdf_upload_id: string;
          p_expires_in_minutes?: number;
        };
        Returns: string;
      };
      validate_access_token: {
        Args: {
          p_token: string;
        };
        Returns: string;
      };
    };
  };
} 