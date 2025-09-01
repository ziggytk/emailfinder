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
  addressMatchScore: number; // 0-100 - new field for address matching
  matchedPropertyAddress?: string; // Address of the property this bill is associated with
  utilityProvider?: string; // User-provided utility provider name
  status: 'pending' | 'approved' | 'rejected';
  wasEdited: boolean; // Track if user edited the data
  rejectionComment?: string; // Comment when bill is rejected
  associatedPropertyId?: string; // ID of the property this bill is associated with
  paymentStatus?: 'unpaid' | 'paid' | 'failed' | 'pending';
  stripePaymentIntentId?: string;
  paidAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface BillExtractionRequest {
  imageUrl: string;
  propertyAddresses?: string[]; // Array of property addresses to match against
  utilityProviders?: string[]; // Array of utility provider names to associate with bills
}

export interface BillExtractionResponse {
  success: boolean;
  data?: BillData;
  error?: string;
}
