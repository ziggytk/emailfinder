export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface UtilityProvider {
  id: string;
  name: string;
  domains: string[];
  description?: string;
}

export interface UtilityAccount {
  id: string;
  provider: UtilityProvider;
  address: Address;
  accountNumber?: string;
  customerName?: string;
}

export interface UtilityBill {
  id: string;
  messageId: string;
  provider: UtilityProvider;
  address: Address; // Add address for zipcode-based password handling
  subject: string;
  from: {
    name: string;
    email: string;
  };
  date: Date;
  hasPdfAttachment: boolean;
  pdfUrl?: string;
  amount?: string;
  billNumber?: string;
  
  // PDF processing information
  pdfProcessingStatus?: 'not_processed' | 'uploaded' | 'processing' | 'completed' | 'failed';
  pdfUploadId?: string;
  imageUrls?: string[];
  accessToken?: string;
  processingError?: string;
  processingErrorType?: 'pdf_not_found' | 'pdf_encrypted' | 'pdf_corrupted' | 'conversion_failed' | 'upload_failed' | 'unknown';
  processingErrorDetails?: string;
}

export interface BillSearchResult {
  bills: UtilityBill[];
  totalFound: number;
  searchCompleted: boolean;
  error?: string;
} 