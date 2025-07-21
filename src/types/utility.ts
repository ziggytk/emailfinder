export interface UtilityProvider {
  id: string;
  name: string;
  domains: string[];
  description?: string;
}

export interface UtilityBill {
  id: string;
  messageId: string;
  provider: UtilityProvider;
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
}

export interface BillSearchResult {
  bills: UtilityBill[];
  totalFound: number;
  searchCompleted: boolean;
  error?: string;
} 