import { supabase } from './supabaseClient';
import { pdfToImageService, PdfPageImage } from './pdfToImageService';
import { gmailApiService } from './gmailApi';
import { supabaseAuthService, SupabaseUser } from './supabaseAuthService';

export interface PdfUploadResult {
  id: string;
  messageId: string;
  providerId: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  imageUrls: string[];
  accessToken?: string;
  error?: string;
  errorType?: 'pdf_not_found' | 'pdf_encrypted' | 'pdf_corrupted' | 'conversion_failed' | 'upload_failed' | 'unknown';
  errorDetails?: string;
}

export interface PdfDownloadUrl {
  url: string;
  expiresAt: Date;
  token: string;
}

export class PdfUploadService {
  /**
   * Classify PDF processing errors to provide better error handling
   */
  private classifyPdfError(error: any): { type: string; details: string } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.log('🔍 Classifying PDF error:', { errorMessage, errorName, errorStack });
    
    // Check for encrypted PDF errors
    if (errorMessage.includes('password') || 
        errorMessage.includes('encrypted') || 
        errorMessage.includes('PasswordRequiredException') ||
        errorMessage.includes('InvalidPasswordException') ||
        errorMessage.includes('encryption') ||
        errorMessage.includes('protected') ||
        errorName === 'PasswordException' ||
        errorName === 'PasswordRequiredException' ||
        errorName === 'InvalidPasswordException') {
      return {
        type: 'pdf_encrypted',
        details: 'PDF is password-protected or encrypted and cannot be processed without the password'
      };
    }
    
    // Check for corrupted PDF errors
    if (errorMessage.includes('corrupted') || 
        errorMessage.includes('invalid') || 
        errorMessage.includes('InvalidPDFException') ||
        errorMessage.includes('UnexpectedEndException') ||
        errorMessage.includes('MissingPDFException') ||
        errorMessage.includes('malformed')) {
      return {
        type: 'pdf_corrupted',
        details: 'PDF file appears to be corrupted or invalid'
      };
    }
    
    // Check for PDF not found errors
    if (errorMessage.includes('No PDF attachment found') || 
        errorMessage.includes('No PDF attachments found') ||
        errorMessage.includes('pdf not found')) {
      return {
        type: 'pdf_not_found',
        details: 'No PDF attachment was found in the email message'
      };
    }
    
    // Check for conversion errors
    if (errorMessage.includes('convert') || 
        errorMessage.includes('conversion') || 
        errorMessage.includes('render') ||
        errorMessage.includes('canvas') ||
        errorMessage.includes('image')) {
      return {
        type: 'conversion_failed',
        details: 'Failed to convert PDF to images during processing'
      };
    }
    
    // Check for upload errors
    if (errorMessage.includes('upload') || 
        errorMessage.includes('storage') || 
        errorMessage.includes('Supabase') ||
        errorMessage.includes('bucket')) {
      return {
        type: 'upload_failed',
        details: 'Failed to upload processed images to storage'
      };
    }
    
    // Default to unknown error
    return {
      type: 'unknown',
      details: `Unexpected error: ${errorMessage}`
    };
  }

  /**
   * Find PDF attachments by examining the Gmail message payload structure
   */
  private findPdfAttachments(message: any): { filename: string; attachmentId: string }[] {
    const pdfAttachments: { filename: string; attachmentId: string }[] = [];

    const parts = message.payload?.parts || [];

    const isPdfAttachment = (part: any): boolean => {
      // Check if it's explicitly a PDF by MIME type
      if (part.mimeType === 'application/pdf') {
        return true;
      }
      // Check if it's an octet-stream with a PDF filename
      if (part.mimeType === 'application/octet-stream' && part.filename) {
        return part.filename.toLowerCase().endsWith('.pdf');
      }
      return false;
    };

    parts.forEach((part: any) => {
      if (isPdfAttachment(part) && part.filename) {
        if (part.body?.attachmentId) {
          pdfAttachments.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId
          });
        }
      }

      // Handle nested parts (multipart/mixed or multipart/alternative structures)
      if (part.parts) {
        part.parts.forEach((subPart: any) => {
          if (isPdfAttachment(subPart) && subPart.filename) {
            if (subPart.body?.attachmentId) {
              pdfAttachments.push({
                filename: subPart.filename,
                attachmentId: subPart.body.attachmentId
              });
            }
          }
        });
      }
    });

    return pdfAttachments;
  }
  /**
   * Process a PDF attachment from Gmail: convert to images, upload to Supabase, generate access token
   */
  async processPdfAttachment(
    messageId: string,
    providerId: string,
    options: {
      maxPages?: number;
      imageFormat?: 'png' | 'jpeg';
      imageQuality?: number;
      tokenExpiryMinutes?: number;
      zipcode?: string;
    } = {}
  ): Promise<PdfUploadResult> {
    const {
      maxPages = 3,
      imageFormat = 'png',
      imageQuality = 0.9,
      tokenExpiryMinutes = 10,
      zipcode
    } = options;

    try {
      console.log('🚀 Starting PDF processing pipeline...');
      console.log(`📧 Message ID: ${messageId}, Provider: ${providerId}`);
      console.log(`⚙️ Options: maxPages=${maxPages}, format=${imageFormat}, quality=${imageQuality}`);

      // Step 1: Get the current user (use Supabase auth with Google OAuth)
      console.log('👤 Step 1: Getting current user...');
      let user: SupabaseUser;
      
      try {
        user = await supabaseAuthService.ensureAuthenticated();
        console.log(`✅ User authenticated with Supabase: ${user.id}`);
      } catch (authError) {
        console.error('❌ Failed to authenticate with Supabase:', authError);
        throw new Error(`Failed to authenticate with Supabase: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
      }

      // Step 2: Download PDF attachment from Gmail
      console.log('📥 Step 2: Downloading PDF attachment from Gmail...');
      const pdfBuffer = await this.downloadPdfFromGmail(messageId);
      if (!pdfBuffer) {
        console.error('❌ No PDF attachment found in message');
        throw new Error('No PDF attachment found in message');
      }
      console.log(`✅ PDF downloaded: ${pdfBuffer.byteLength} bytes`);

      // Step 3: Convert PDF to images (with password retry for encrypted PDFs)
      console.log('🔄 Step 3: Converting PDF to images...');
      let images: PdfPageImage[];
      
      try {
        // First try without password
        // Ensure we have a valid ArrayBuffer before passing to conversion service
        if (!pdfBuffer || pdfBuffer.byteLength === 0) {
          throw new Error('Invalid PDF buffer: buffer is null, undefined, or empty');
        }
        
        // Create a copy of the buffer to prevent detachment issues
        const bufferCopy = pdfBuffer.slice(0);
        
        images = await pdfToImageService.convertPdfToImages(bufferCopy, {
          maxPages,
          format: imageFormat,
          quality: imageQuality
        });
        console.log(`✅ PDF converted to ${images.length} images (no password needed)`);
      } catch (conversionError) {
        // Check if it's an encrypted PDF error
        const errorMessage = conversionError instanceof Error ? conversionError.message : String(conversionError);
        const errorName = conversionError instanceof Error ? conversionError.name : '';
        
        const isEncryptedError = errorMessage.includes('password') || 
                                errorMessage.includes('encrypted') || 
                                errorMessage.includes('PasswordRequiredException') ||
                                errorMessage.includes('InvalidPasswordException') ||
                                errorMessage.includes('encryption') ||
                                errorMessage.includes('protected') ||
                                errorName === 'PasswordException' ||
                                errorName === 'PasswordRequiredException' ||
                                errorName === 'InvalidPasswordException';
        
        if (isEncryptedError && zipcode) {
          console.log('🔐 PDF appears to be encrypted, trying with zipcode password...');
          
          // Extract first 5 digits of zipcode
          const password = zipcode.substring(0, 5);
          console.log(`🔑 Using zipcode password: ${password}`);
          
                try {
        // Ensure we have a valid ArrayBuffer before passing to conversion service
        if (!pdfBuffer || pdfBuffer.byteLength === 0) {
          throw new Error('Invalid PDF buffer: buffer is null, undefined, or empty');
        }
        
        // Create a copy of the buffer to prevent detachment issues
        const bufferCopy = pdfBuffer.slice(0);
        
        images = await pdfToImageService.convertPdfToImages(bufferCopy, {
          maxPages,
          format: imageFormat,
          quality: imageQuality,
          password: password
        });
        console.log(`✅ PDF converted to ${images.length} images (using zipcode password)`);
      } catch (passwordError) {
            console.error('❌ Failed to decrypt PDF with zipcode password:', passwordError);
            const classifiedError = this.classifyPdfError(passwordError);
            throw new Error(`PDF is encrypted and zipcode password (${password}) is incorrect: ${classifiedError.details}`);
          }
        } else if (isEncryptedError && !zipcode) {
          // PDF is encrypted but no zipcode provided
          console.error('❌ PDF is encrypted but no zipcode provided');
          throw new Error('PDF is encrypted and requires a password. Please provide a zipcode to decrypt the PDF.');
        } else {
          // Re-throw the original error if it's not an encryption issue
          throw conversionError;
        }
      }

      // Step 4: Create PDF upload record
      console.log('💾 Step 4: Creating PDF upload record in database...');
      const { data: pdfUpload, error: uploadError } = await supabase
        .from('pdf_uploads')
        .insert({
          user_id: user.id,
          message_id: messageId,
          provider_id: providerId,
          original_filename: `bill-${messageId}.pdf`,
          file_size: pdfBuffer.byteLength,
          file_path: `${user.id}/${messageId}/original.pdf`,
          status: 'uploaded'
        })
        .select()
        .single();

      if (uploadError) {
        console.error('❌ Failed to create PDF upload record:', uploadError);
        throw new Error(`Failed to create PDF upload record: ${uploadError.message}`);
      }
      console.log(`✅ PDF upload record created: ${pdfUpload.id}`);

      // Step 5: Upload images to Supabase Storage
      console.log('📤 Step 5: Uploading images to Supabase Storage bucket "utility-bills"...');
      const imageUrls = await this.uploadImagesToStorage(images, user.id, messageId, imageFormat);
      console.log(`✅ ${imageUrls.length} images uploaded to Supabase Storage`);

      // Step 6: Update PDF upload status
      console.log('📝 Step 6: Updating PDF upload status to completed...');
      await supabase
        .from('pdf_uploads')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', pdfUpload.id);
      console.log('✅ PDF upload status updated to completed');

      // Step 7: Generate one-time access token
      console.log('🔑 Step 7: Generating one-time access token...');
      const { data: token, error: tokenError } = await supabase.rpc('create_access_token', {
        p_pdf_upload_id: pdfUpload.id,
        p_expires_in_minutes: tokenExpiryMinutes
      });

      if (tokenError) {
        console.warn('⚠️ Failed to generate access token:', tokenError);
      } else {
        console.log('✅ Access token generated successfully');
      }

      // Step 8: Log audit event
      console.log('📋 Step 8: Logging audit event...');
      await supabase.rpc('log_audit_event', {
        p_action: 'pdf_processed',
        p_resource_type: 'pdf_upload',
        p_resource_id: pdfUpload.id,
        p_details: {
          messageId,
          providerId,
          imageCount: images.length,
          totalSize: pdfBuffer.byteLength
        }
      });
      console.log('✅ Audit event logged');

      console.log('🎉 PDF processing completed successfully');
      console.log(`📊 Summary: ${images.length} images uploaded to utility-bills bucket`);
      console.log(`🔗 Image URLs: ${imageUrls.length} generated`);
      console.log(`🆔 Upload ID: ${pdfUpload.id}`);

      // Ensure we're returning a clean success result
      const result = {
        id: pdfUpload.id,
        messageId,
        providerId,
        status: 'completed' as const,
        imageUrls,
        accessToken: token || undefined
      };
      
      console.log('✅ Returning successful result:', result);
      return result;

    } catch (error) {
      console.error('❌ PDF processing failed:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Classify the error for better handling
      const errorClassification = this.classifyPdfError(error);
      console.log(`🔍 Error classification: ${errorClassification.type} - ${errorClassification.details}`);
      
      // Log the error with classification
      try {
        await supabase.rpc('log_audit_event', {
          p_action: 'pdf_processing_failed',
          p_resource_type: 'pdf_upload',
          p_resource_id: messageId,
          p_details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: errorClassification.type,
            errorDetails: errorClassification.details,
            messageId,
            providerId
          }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      // Return detailed error information
      return {
        id: '',
        messageId,
        providerId,
        status: 'failed',
        imageUrls: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: errorClassification.type as any,
        errorDetails: errorClassification.details
      };
    }
  }

  /**
   * Download PDF attachment from Gmail message
   */
  private async downloadPdfFromGmail(messageId: string): Promise<ArrayBuffer | null> {
    try {
      // Get the full message with attachments
      const message = await gmailApiService.getMessage(messageId);
      
      console.log('🔍 Message structure:', {
        hasAttachments: !!message.attachments,
        attachmentCount: message.attachments?.length || 0,
        attachments: message.attachments?.map((att: any) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          hasData: !!att.data,
          dataLength: att.data?.length || 0
        }))
      });
      
      // Use the new findPdfAttachments function to scan the raw message payload
      console.log('🔍 Scanning message payload for PDF attachments...');
      const pdfAttachments = this.findPdfAttachments(message);
      
      console.log(`🔍 Found ${pdfAttachments.length} PDF attachments in message payload:`);
      pdfAttachments.forEach((pdfAtt: { filename: string; attachmentId: string }, index: number) => {
        console.log(`   PDF ${index + 1}: ${pdfAtt.filename} (ID: ${pdfAtt.attachmentId})`);
      });
      
      if (pdfAttachments.length === 0) {
        console.log('❌ No PDF attachments found in message payload');
        return null;
      }
      
      // Use the first PDF attachment found
      const pdfAttachmentInfo = pdfAttachments[0];
      console.log(`✅ Using PDF attachment: ${pdfAttachmentInfo.filename}`);
      
      // Find the corresponding attachment in the pre-processed attachments array
      const preProcessedAttachment = message.attachments?.find((att: any) => 
        att.filename === pdfAttachmentInfo.filename || 
        att.id === pdfAttachmentInfo.attachmentId
      );
      
      if (!preProcessedAttachment) {
        console.log('⚠️ PDF found in payload but not in pre-processed attachments, fetching data directly...');
        // Fetch attachment data directly using the attachment ID
        try {
          const attachmentData = await gmailApiService.getAttachmentData(messageId, pdfAttachmentInfo.attachmentId);
          console.log(`✅ Attachment data fetched: ${attachmentData.length} characters`);
          
          // Validate and decode base64 attachment data
          console.log(`🔍 Validating fetched attachment data: ${attachmentData.length} characters`);
          console.log(`🔍 Data preview: ${attachmentData.substring(0, 100)}...`);
          
          // Check if the data looks like valid base64 (standard or URL-safe)
          const standardBase64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          const urlSafeBase64Regex = /^[A-Za-z0-9\-_]*={0,2}$/;
          
          if (!standardBase64Regex.test(attachmentData) && !urlSafeBase64Regex.test(attachmentData)) {
            console.error('❌ Invalid base64 data detected in fetched attachment');
            console.error('❌ Data contains invalid characters for base64 encoding');
            throw new Error('Invalid base64 data: fetched attachment data is not properly base64 encoded');
          }
          
          // Convert URL-safe base64 to standard base64 if needed
          let processedData = attachmentData;
          if (urlSafeBase64Regex.test(attachmentData) && !standardBase64Regex.test(attachmentData)) {
            console.log('🔄 Converting URL-safe base64 to standard base64...');
            processedData = attachmentData.replace(/-/g, '+').replace(/_/g, '/');
          }
          
          try {
            const binaryString = atob(processedData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log(`✅ PDF decoded successfully: ${bytes.length} bytes`);
            // Create a copy of the buffer to prevent detachment issues
            return bytes.buffer.slice(0);
          } catch (decodeError) {
            console.error('❌ Base64 decode error for fetched attachment:', decodeError);
            console.error('❌ Data length:', attachmentData.length);
            console.error('❌ Data preview:', attachmentData.substring(0, 200));
            throw new Error(`Failed to decode base64 data: ${decodeError instanceof Error ? decodeError.message : 'Unknown decode error'}`);
          }
        } catch (error) {
          console.error('❌ Failed to fetch attachment data:', error);
          return null;
        }
      }
      
      console.log('🔍 Using pre-processed attachment data');
      
      if (!preProcessedAttachment.data) {
        console.log('⚠️ PDF attachment found but no data available, fetching attachment data...');
        
        if (!preProcessedAttachment.id) {
          console.log('❌ No attachment ID available to fetch data');
          return null;
        }
        
        try {
          // Fetch attachment data separately
          const attachmentData = await gmailApiService.getAttachmentData(messageId, preProcessedAttachment.id);
          preProcessedAttachment.data = attachmentData;
          console.log(`✅ Attachment data fetched: ${attachmentData.length} characters`);
        } catch (error) {
          console.error('❌ Failed to fetch attachment data:', error);
          return null;
        }
      }

      if (!preProcessedAttachment.data) {
        console.log('⚠️ PDF attachment found but no data available, fetching attachment data...');
        
        if (!preProcessedAttachment.id) {
          console.log('❌ No attachment ID available to fetch data');
          return null;
        }
        
        try {
          // Fetch attachment data separately
          const attachmentData = await gmailApiService.getAttachmentData(messageId, preProcessedAttachment.id);
          preProcessedAttachment.data = attachmentData;
          console.log(`✅ Attachment data fetched: ${attachmentData.length} characters`);
        } catch (error) {
          console.error('❌ Failed to fetch attachment data:', error);
          return null;
        }
      }

            // Validate and decode base64 attachment data
      console.log(`🔍 Validating base64 data: ${preProcessedAttachment.data.length} characters`);
      console.log(`🔍 Data preview: ${preProcessedAttachment.data.substring(0, 100)}...`);
      
      // Check if the data looks like valid base64 (standard or URL-safe)
      const standardBase64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      const urlSafeBase64Regex = /^[A-Za-z0-9\-_]*={0,2}$/;
      
      if (!standardBase64Regex.test(preProcessedAttachment.data) && !urlSafeBase64Regex.test(preProcessedAttachment.data)) {
        console.error('❌ Invalid base64 data detected');
        console.error('❌ Data contains invalid characters for base64 encoding');
        throw new Error('Invalid base64 data: attachment data is not properly base64 encoded');
      }
      
      // Convert URL-safe base64 to standard base64 if needed
      let processedData = preProcessedAttachment.data;
      if (urlSafeBase64Regex.test(preProcessedAttachment.data) && !standardBase64Regex.test(preProcessedAttachment.data)) {
        console.log('🔄 Converting URL-safe base64 to standard base64...');
        processedData = preProcessedAttachment.data.replace(/-/g, '+').replace(/_/g, '/');
      }
      
      try {
        const binaryString = atob(processedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log(`✅ PDF decoded successfully: ${bytes.length} bytes`);
        // Create a copy of the buffer to prevent detachment issues
        return bytes.buffer.slice(0);
      } catch (decodeError) {
        console.error('❌ Base64 decode error:', decodeError);
        console.error('❌ Data length:', preProcessedAttachment.data.length);
        console.error('❌ Data preview:', preProcessedAttachment.data.substring(0, 200));
        throw new Error(`Failed to decode base64 data: ${decodeError instanceof Error ? decodeError.message : 'Unknown decode error'}`);
      }
    } catch (error) {
      console.error('Error downloading PDF from Gmail:', error);
      throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload images to Supabase Storage
   */
  private async uploadImagesToStorage(
    images: PdfPageImage[],
    userId: string,
    messageId: string,
    format: string
  ): Promise<string[]> {
    const imageUrls: string[] = [];
    console.log(`📤 Starting upload of ${images.length} images to utility-bills bucket...`);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const fileName = `page-${image.pageNumber}.${format}`;
        const filePath = `${userId}/${messageId}/${fileName}`;
        
        console.log(`📄 Uploading image ${i + 1}/${images.length}: ${fileName}`);
        console.log(`📁 File path: ${filePath}`);
        console.log(`📏 Image size: ${image.width}x${image.height}px`);
        console.log(`💾 Image data size: ${image.imageData.length} bytes`);

        // Upload image to Supabase Storage
        const { data, error } = await supabase.storage
          .from('utility-bills')
          .upload(filePath, image.imageData, {
            contentType: format === 'png' ? 'image/png' : 'image/jpeg',
            upsert: false
          });

        if (error) {
          console.error(`❌ Failed to upload image ${fileName}:`, error);
          console.error(`🔍 Error details:`, {
            message: error.message
          });
          continue;
        }

        console.log(`✅ Image uploaded successfully: ${fileName}`);
        console.log(`🆔 Storage file ID: ${data?.path}`);

        // Generate signed URL for the uploaded image
        console.log(`🔗 Generating signed URL for ${fileName}...`);
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('utility-bills')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (urlError) {
          console.error(`❌ Failed to generate signed URL for ${fileName}:`, urlError);
        } else if (signedUrl) {
          imageUrls.push(signedUrl.signedUrl);
          console.log(`✅ Signed URL generated for ${fileName}`);
          console.log(`🔗 URL: ${signedUrl.signedUrl.substring(0, 100)}...`);
        } else {
          console.warn(`⚠️ No signed URL data returned for ${fileName}`);
        }

        console.log(`✅ Completed upload for ${fileName}`);
      } catch (error) {
        console.error(`❌ Failed to upload image page ${image.pageNumber}:`, error);
        console.error(`🔍 Error details:`, {
          pageNumber: image.pageNumber,
          format: format,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 Upload summary: ${imageUrls.length}/${images.length} images successfully uploaded`);
    console.log(`🔗 Generated ${imageUrls.length} signed URLs`);
    
    return imageUrls;
  }

  /**
   * Generate a one-time download URL for a PDF
   */
  async generateDownloadUrl(pdfUploadId: string): Promise<PdfDownloadUrl | null> {
    try {
      const { data: token, error } = await supabase.rpc('create_access_token', {
        p_pdf_upload_id: pdfUploadId,
        p_expires_in_minutes: 10
      });

      if (error || !token) {
        console.error('Failed to generate access token:', error);
        return null;
      }

      // Create download URL
      const downloadUrl = `${window.location.origin}/api/download-pdf?token=${token}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      return {
        url: downloadUrl,
        expiresAt,
        token
      };
    } catch (error) {
      console.error('Error generating download URL:', error);
      return null;
    }
  }

  /**
   * Get PDF upload history for the current user
   */
  async getUploadHistory(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('pdf_uploads')
        .select(`
          *,
          pdf_processing_jobs (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching upload history:', error);
      return [];
    }
  }

  /**
   * Get audit logs for the current user
   */
  async getAuditLogs(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }
}

export const pdfUploadService = new PdfUploadService();