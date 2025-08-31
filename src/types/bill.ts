export interface BillData {
  id: string;
  imageUrl: string;
  ownerName: string;
  homeAddress: string;
  accountNumber: string;
  billDueDate: string; // ISO date string
  isAutoPayEnabled: boolean;
  averageDailyElectricUsage: number;
  nextBillingDate: string; // ISO date string
  billingPeriodStart: string; // ISO date string
  billingPeriodEnd: string; // ISO date string
  billingDays: number;
  totalAmountDue: number;
  confidenceScore: number; // 0-100
  status: 'pending' | 'approved' | 'rejected';
  wasEdited: boolean; // Track if user edited the data
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface BillExtractionRequest {
  imageUrl: string;
}

export interface BillExtractionResponse {
  success: boolean;
  data?: BillData;
  error?: string;
}
