import { UtilityProvider, UtilityBill, BillSearchResult } from '../types/utility';
import { gmailApiService, ParsedEmail } from './gmailApi';
import { pdfUploadService } from './pdfUploadService';
import { supabaseAuthService } from './supabaseAuthService';

// Predefined utility providers
const DEFAULT_UTILITY_PROVIDERS: UtilityProvider[] = [
  {
    id: 'coned',
    name: 'ConEdison',
    domains: ['emailconed.com'],
    description: 'Consolidated Edison - New York'
  },
  {
    id: 'pge',
    name: 'Pacific Gas & Electric',
    domains: ['pge.com', 'pgecorp.com'],
    description: 'Pacific Gas & Electric - California'
  },
  {
    id: 'duke',
    name: 'Duke Energy',
    domains: ['duke-energy.com', 'dukeenergy.com'],
    description: 'Duke Energy - Multiple States'
  },
  {
    id: 'national-grid',
    name: 'National Grid',
    domains: ['nationalgrid.com', 'nationalgridus.com'],
    description: 'National Grid - Multiple States'
  },
  {
    id: 'southern-california-edison',
    name: 'Southern California Edison',
    domains: ['sce.com', 'scecorp.com'],
    description: 'Southern California Edison'
  },
  {
    id: 'exelon',
    name: 'Exelon',
    domains: ['exeloncorp.com', 'exelon.com'],
    description: 'Exelon Corporation'
  },
  {
    id: 'dominion',
    name: 'Dominion Energy',
    domains: ['dominionenergy.com', 'dom.com'],
    description: 'Dominion Energy'
  },
  {
    id: 'nextera',
    name: 'NextEra Energy',
    domains: ['nexteraenergy.com', 'fpl.com'],
    description: 'NextEra Energy / Florida Power & Light'
  }
];

class UtilityService {
  private selectedProviders: UtilityProvider[] = [];
  private selectedAccounts: UtilityAccount[] = [];

  // Get all available utility providers
  getAvailableProviders(): UtilityProvider[] {
    return DEFAULT_UTILITY_PROVIDERS;
  }

  // Get selected providers
  getSelectedProviders(): UtilityProvider[] {
    return this.selectedProviders;
  }

  // Add a provider to selection
  addProvider(provider: UtilityProvider): void {
    if (!this.selectedProviders.find(p => p.id === provider.id)) {
      this.selectedProviders.push(provider);
    }
  }

  // Remove a provider from selection
  removeProvider(providerId: string): void {
    this.selectedProviders = this.selectedProviders.filter(p => p.id !== providerId);
  }

  // Clear all selected providers
  clearProviders(): void {
    this.selectedProviders = [];
  }

  // Account management methods
  setSelectedAccounts(accounts: UtilityAccount[]): void {
    this.selectedAccounts = accounts;
    // Also update selected providers for backward compatibility
    this.selectedProviders = accounts.map(account => account.provider);
  }

  getSelectedAccounts(): UtilityAccount[] {
    return this.selectedAccounts;
  }

  // Check if an email domain matches any selected provider
  private isFromUtilityProvider(emailDomain: string): boolean {
    const domain = emailDomain.toLowerCase();
    
    return this.selectedProviders.some(provider => 
      provider.domains.some(providerDomain => 
        domain.includes(providerDomain.toLowerCase()) || 
        providerDomain.toLowerCase().includes(domain)
      )
    );
  }

  // Extract domain from email address
  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : '';
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

    parts.forEach(part => {
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
        part.parts.forEach(subPart => {
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

  // Search for utility bills in Gmail
  async searchUtilityBills(monthsBack: number = 6): Promise<BillSearchResult> {
    if (this.selectedProviders.length === 0) {
      return {
        bills: [],
        totalFound: 0,
        searchCompleted: true,
        error: 'No utility providers selected'
      };
    }

    try {
      console.log('🔍 Searching for utility bills...');
      console.log('Selected providers:', this.selectedProviders.map(p => p.name));

      // Calculate date range (6 months back)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      // Phase 1: Build provider-specific search query
      const dateQuery = `after:${startDate.toISOString().split('T')[0]} before:${endDate.toISOString().split('T')[0]}`;
      
      // Create domain search clauses for each provider
      const providerQueries = this.selectedProviders.map(provider => {
        const domainClauses = provider.domains.map(domain => 
          `from:${domain} OR from:*@${domain}`
        ).join(' OR ');
        return `(${domainClauses})`;
      });

      // Combine all providers with OR
      const providerQuery = providerQueries.join(' OR ');
      const searchQuery = `${dateQuery} (${providerQuery})`;

      console.log('🔍 Phase 1: Provider-specific search query:', searchQuery);

      // Phase 2: Get emails from utility providers with attachments only
      const attachmentQuery = `${searchQuery} has:attachment`;
      console.log('🔍 Phase 2: Searching for emails with attachments...');
      console.log('🔍 Attachment search query:', attachmentQuery);
      
      const providerEmails = await gmailApiService.searchMessages(attachmentQuery, 200);
      console.log(`📧 Phase 2: Found ${providerEmails.length} emails with attachments from utility providers`);

      // Phase 3: Filter for emails with PDF attachments
      const emailsWithPdfAttachments: ParsedEmail[] = [];
      
      console.log('🔍 Phase 3: Filtering for PDF attachments...');
      console.log(`📧 Processing ${providerEmails.length} emails from Phase 2...`);
      
      for (let i = 0; i < providerEmails.length; i++) {
        const email = providerEmails[i];
        console.log(`\n🔍 Processing email ${i + 1}/${providerEmails.length}:`);
        console.log(`   📧 Email ID: ${email.id}`);
        console.log(`   📄 Subject: "${email.subject}"`);
        console.log(`   📧 From: ${email.from.email}`);
        console.log(`   📎 Has Attachments (from ParsedEmail): ${email.hasAttachments}`);
        
        // Get the full message to check for PDF attachments
        try {
          console.log(`   🔍 Fetching full message data for ${email.id}...`);
          const fullMessage = await gmailApiService.getMessage(email.id);
          
          console.log(`   📊 Full message structure:`, {
            hasPayload: !!fullMessage.payload,
            payloadParts: fullMessage.payload?.parts?.length || 0,
            hasAttachments: !!fullMessage.attachments,
            attachmentCount: fullMessage.attachments?.length || 0
          });
          
          // Log all parts in the payload
          if (fullMessage.payload?.parts) {
            console.log(`   📋 Payload parts (${fullMessage.payload.parts.length}):`);
            fullMessage.payload.parts.forEach((part: any, partIndex: number) => {
              console.log(`     Part ${partIndex + 1}:`, {
                mimeType: part.mimeType,
                filename: part.filename,
                hasBody: !!part.body,
                hasAttachmentId: !!part.body?.attachmentId,
                hasParts: !!part.parts,
                subPartsCount: part.parts?.length || 0
              });
              
              // Log sub-parts if they exist
              if (part.parts) {
                part.parts.forEach((subPart: any, subIndex: number) => {
                  console.log(`       Sub-part ${subIndex + 1}:`, {
                    mimeType: subPart.mimeType,
                    filename: subPart.filename,
                    hasBody: !!subPart.body,
                    hasAttachmentId: !!subPart.body?.attachmentId
                  });
                });
              }
            });
          }
          
          // Log pre-processed attachments
          if (fullMessage.attachments) {
            console.log(`   📎 Pre-processed attachments (${fullMessage.attachments.length}):`);
            fullMessage.attachments.forEach((att: any, attIndex: number) => {
              console.log(`     Attachment ${attIndex + 1}:`, {
                filename: att.filename,
                mimeType: att.mimeType,
                id: att.id,
                hasData: !!att.data,
                dataLength: att.data?.length || 0
              });
            });
          }
          
          const pdfAttachments = this.findPdfAttachments(fullMessage);
          console.log(`   🔍 PDF attachments found by findPdfAttachments(): ${pdfAttachments.length}`);
          
          if (pdfAttachments.length > 0) {
            console.log(`   ✅ Found ${pdfAttachments.length} PDF attachment(s) in email: ${email.subject}`);
            pdfAttachments.forEach((pdfAtt, index) => {
              console.log(`     PDF ${index + 1}: ${pdfAtt.filename} (ID: ${pdfAtt.attachmentId})`);
            });
            emailsWithPdfAttachments.push(email);
          } else {
            console.log(`   ❌ No PDF attachments found in email: ${email.subject}`);
            
            // Additional debugging: check if there are any attachments that might be PDFs
            if (fullMessage.attachments && fullMessage.attachments.length > 0) {
              console.log(`   🔍 Checking pre-processed attachments for PDF indicators...`);
              fullMessage.attachments.forEach((att: any, index: number) => {
                const isPdfByFilename = att.filename?.toLowerCase().endsWith('.pdf');
                const isPdfByMimeType = att.mimeType === 'application/pdf';
                console.log(`     Attachment ${index + 1} PDF check:`, {
                  filename: att.filename,
                  mimeType: att.mimeType,
                  isPdfByFilename,
                  isPdfByMimeType,
                  wouldBeDetected: isPdfByFilename || isPdfByMimeType
                });
              });
            }
          }
        } catch (error) {
          console.error(`   ⚠️ Error checking attachments for email ${email.id}:`, error);
          // Fallback: include if subject mentions PDF
          if (email.subject.toLowerCase().includes('pdf')) {
            console.log(`   📄 Including email due to PDF mention in subject: ${email.subject}`);
            emailsWithPdfAttachments.push(email);
          }
        }
      }

      console.log(`📎 Phase 3: Found ${emailsWithPdfAttachments.length} emails with PDF attachments`);

      // Phase 4: Process emails and create utility bills
      const utilityBills: UtilityBill[] = [];
      
      for (const message of emailsWithPdfAttachments) {
        const emailDomain = this.extractDomain(message.from.email);
        
        // Find which provider this matches
        const matchingProvider = this.selectedProviders.find(provider => 
          provider.domains.some(domain => 
            emailDomain.includes(domain.toLowerCase()) || 
            domain.toLowerCase().includes(emailDomain)
          )
        );

        if (matchingProvider) {
          // Try to extract amount and bill number from subject
          const amountMatch = message.subject.match(/\$([0-9,]+\.?[0-9]*)/);
          const billNumberMatch = message.subject.match(/bill\s*#?([A-Z0-9-]+)/i);
          
          // Since we've already confirmed this email has PDF attachments in Phase 3,
          // we can simplify the logic here
          const hasPdfAttachment = true; // Already confirmed in Phase 3
          
          console.log(`🔍 Processing confirmed PDF email: ${message.id}:`);
          console.log(`   📄 Subject: "${message.subject}"`);
          console.log(`   📎 hasPdfAttachment: ${hasPdfAttachment}`);
          console.log(`   🏢 Provider: ${matchingProvider.name}`);
          console.log(`   📧 From: ${message.from.email}`);
          
          // Find the matching account for this provider to get the address
          const matchingAccount = this.selectedAccounts.find(account => account.provider.id === matchingProvider.id);
          const address = matchingAccount?.address || {
            street: 'Unknown',
            city: 'Unknown', 
            state: 'Unknown',
            zipCode: '00000'
          };

          const bill: UtilityBill = {
            id: `${message.id}-${matchingProvider.id}`,
            messageId: message.id,
            provider: matchingProvider,
            address: address,
            subject: message.subject,
            from: message.from,
            date: message.date,
            hasPdfAttachment: hasPdfAttachment,
            amount: amountMatch ? amountMatch[1] : undefined,
            billNumber: billNumberMatch ? billNumberMatch[1] : undefined
          };

          utilityBills.push(bill);
          console.log(`   ✅ Added bill to array. Total bills: ${utilityBills.length}`);
        }
      }

      console.log(`✅ Phase 4: Found ${utilityBills.length} utility bills`);
      
      // Debug: Show PDF attachment analysis
      console.log(`🔍 PDF Attachment Analysis:`);
      const allAttachments = utilityBills.map(bill => ({
        messageId: bill.messageId,
        subject: bill.subject,
        provider: bill.provider.name,
        hasPdfAttachment: bill.hasPdfAttachment
      }));
      console.log(`   📊 Emails with confirmed PDF attachments: ${allAttachments.filter(b => b.hasPdfAttachment).length}/${allAttachments.length}`);
      allAttachments.forEach((email, index) => {
        console.log(`   Email ${index + 1}: ${email.messageId} - ${email.provider} - "${email.subject}" - Has PDF attachments: ${email.hasPdfAttachment}`);
      });

      // Phase 5: Process PDFs for bills with attachments
      if (utilityBills.length > 0) {
        console.log('🔄 Phase 5: Processing PDFs for bills with attachments...');
        const billsWithPdfs = utilityBills.filter(bill => bill.hasPdfAttachment);
        
        console.log(`🔍 PDF Processing Debug:`);
        console.log(`   📊 Total bills found: ${utilityBills.length}`);
        console.log(`   📄 Bills with PDF attachments: ${billsWithPdfs.length}`);
        utilityBills.forEach((bill, index) => {
          console.log(`   Bill ${index + 1}: ${bill.messageId} - hasPdfAttachment: ${bill.hasPdfAttachment} - Provider: ${bill.provider.name} - Subject: "${bill.subject}"`);
        });
        
        if (billsWithPdfs.length > 0) {
          console.log(`📄 Processing ${billsWithPdfs.length} bills with confirmed PDF attachments`);
          console.log('🚀 Starting PDF upload to Supabase utility-bills bucket...');
          
          for (let i = 0; i < billsWithPdfs.length; i++) {
            const bill = billsWithPdfs[i];
            console.log(`\n📋 Processing bill ${i + 1}/${billsWithPdfs.length}:`);
            console.log(`   📧 Message ID: ${bill.messageId}`);
            console.log(`   🏢 Provider: ${bill.provider.name}`);
            console.log(`   📄 Subject: ${bill.subject}`);
            console.log(`   💰 Amount: ${bill.amount || 'Not found'}`);
            console.log(`   🔢 Bill Number: ${bill.billNumber || 'Not found'}`);
            
            try {
              const processedBill = await this.processPdfForBill(bill);
              
              // Update the bill in the array with processing results
              const index = utilityBills.findIndex(b => b.id === bill.id);
              if (index !== -1) {
                utilityBills[index] = processedBill;
              }
              
              // Log processing results
              if (processedBill.pdfProcessingStatus === 'completed') {
                console.log(`   ✅ PDF processing completed successfully`);
                console.log(`   🆔 Upload ID: ${processedBill.pdfUploadId}`);
                console.log(`   🖼️ Images uploaded: ${processedBill.imageUrls?.length || 0}`);
                console.log(`   🔑 Access token: ${processedBill.accessToken ? 'Generated' : 'Not generated'}`);
              } else {
                console.log(`   ❌ PDF processing failed: ${processedBill.processingError}`);
              }
              
              // Add a small delay to avoid overwhelming the system
              if (i < billsWithPdfs.length - 1) {
                console.log(`   ⏳ Waiting 1 second before next upload...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (error) {
              console.error(`   ❌ Failed to process PDF for bill ${bill.messageId}:`, error);
              // Mark as failed but continue with other bills
              bill.pdfProcessingStatus = 'failed';
              bill.processingError = error instanceof Error ? error.message : 'Unknown error';
            }
          }
          
          console.log(`\n🎉 PDF processing phase completed for ${billsWithPdfs.length} bills`);
          
          // Summary statistics
          const completedBills = utilityBills.filter(b => b.pdfProcessingStatus === 'completed');
          const failedBills = utilityBills.filter(b => b.pdfProcessingStatus === 'failed');
          const notProcessedBills = utilityBills.filter(b => b.pdfProcessingStatus === 'not_processed');
          
          console.log(`📊 Processing Summary:`);
          console.log(`   ✅ Completed: ${completedBills.length}`);
          console.log(`   ❌ Failed: ${failedBills.length}`);
          console.log(`   ⏸️ Not processed: ${notProcessedBills.length}`);
          
          // Detailed error breakdown
          if (failedBills.length > 0) {
            console.log(`📋 Error Breakdown:`);
            const errorTypes = new Map<string, number>();
            failedBills.forEach(bill => {
              // Try to extract error type from processing error message
              const errorMsg = bill.processingError?.toLowerCase() || '';
              let errorType = 'unknown';
              
              if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
                errorType = 'pdf_encrypted';
              } else if (errorMsg.includes('corrupted') || errorMsg.includes('invalid')) {
                errorType = 'pdf_corrupted';
              } else if (errorMsg.includes('no pdf attachment found')) {
                errorType = 'pdf_not_found';
              } else if (errorMsg.includes('convert') || errorMsg.includes('conversion')) {
                errorType = 'conversion_failed';
              } else if (errorMsg.includes('upload') || errorMsg.includes('storage')) {
                errorType = 'upload_failed';
              }
              
              errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
            });
            
            errorTypes.forEach((count, type) => {
              const icon = type === 'pdf_encrypted' ? '🔐' : 
                          type === 'pdf_corrupted' ? '🗑️' : 
                          type === 'pdf_not_found' ? '🔍' : 
                          type === 'conversion_failed' ? '🔄' : 
                          type === 'upload_failed' ? '📤' : '❓';
              console.log(`   ${icon} ${type}: ${count}`);
            });
          }
          
        } else {
          console.log('ℹ️ No bills with PDF attachments found');
        }
      }

      return {
        bills: utilityBills,
        totalFound: utilityBills.length,
        searchCompleted: true
      };

    } catch (error) {
      console.error('Error searching for utility bills:', error);
      return {
        bills: [],
        totalFound: 0,
        searchCompleted: false,
        error: error instanceof Error ? error.message : 'Failed to search for utility bills'
      };
    }
  }

  /**
   * Process PDF attachment for a specific utility bill
   */
  async processPdfForBill(bill: UtilityBill): Promise<UtilityBill> {
    try {
      console.log(`🔄 Processing PDF for bill: ${bill.messageId}`);
      
      // Ensure user is authenticated with Supabase before processing
      console.log('🔐 Ensuring Supabase authentication for PDF processing...');
      await supabaseAuthService.ensureAuthenticated();
      console.log('✅ Supabase authentication confirmed');

      // Process the PDF using the upload service
      console.log(`🔐 Processing PDF for bill with address: ${bill.address.street}, ${bill.address.city}, ${bill.address.state} ${bill.address.zipCode}`);
      const result = await pdfUploadService.processPdfAttachment(
        bill.messageId,
        bill.provider.id,
        {
          maxPages: 3,
          imageFormat: 'png',
          imageQuality: 0.9,
          tokenExpiryMinutes: 30,
          zipcode: bill.address?.zipCode // Pass zipcode for encrypted PDF handling
        }
      );
      
      console.log(`📊 PDF processing result for bill ${bill.messageId}:`, {
        status: result.status,
        imageCount: result.imageUrls?.length || 0,
        hasError: !!result.error,
        error: result.error,
        errorType: result.errorType,
        errorDetails: result.errorDetails
      });

      // Update the bill with processing results
      const updatedBill: UtilityBill = {
        ...bill,
        pdfProcessingStatus: result.status,
        pdfUploadId: result.id,
        imageUrls: result.imageUrls,
        accessToken: result.accessToken,
        // Only set error fields if there's actually an error
        ...(result.error && { processingError: result.error }),
        ...(result.errorType && { processingErrorType: result.errorType }),
        ...(result.errorDetails && { processingErrorDetails: result.errorDetails })
      };

      // Log detailed processing results
      if (result.status === 'completed') {
        console.log(`✅ PDF processing completed for bill ${bill.messageId}: ${result.status}`);
        console.log(`   🖼️ Images generated: ${result.imageUrls.length}`);
        console.log(`   🔑 Access token: ${result.accessToken ? 'Generated' : 'Not generated'}`);
      } else if (result.status === 'failed') {
        console.log(`❌ PDF processing failed for bill ${bill.messageId}: ${result.errorType || 'unknown error'}`);
        console.log(`   📋 Error details: ${result.errorDetails || result.error}`);
        
        // Provide specific guidance based on error type
        if (result.errorType === 'pdf_encrypted') {
          console.log(`   🔐 This PDF appears to be password-protected. Manual processing may be required.`);
        } else if (result.errorType === 'pdf_corrupted') {
          console.log(`   🗑️ This PDF appears to be corrupted or invalid.`);
        } else if (result.errorType === 'pdf_not_found') {
          console.log(`   🔍 No PDF attachment was found in this email.`);
        } else if (result.errorType === 'conversion_failed') {
          console.log(`   🔄 PDF conversion to images failed.`);
        } else if (result.errorType === 'upload_failed') {
          console.log(`   📤 Failed to upload processed images to storage.`);
        }
      }
      
      console.log(`📋 Final bill object for ${bill.messageId}:`, {
        status: updatedBill.pdfProcessingStatus,
        imageCount: updatedBill.imageUrls?.length || 0,
        hasError: !!updatedBill.processingError,
        error: updatedBill.processingError,
        errorType: updatedBill.processingErrorType,
        errorDetails: updatedBill.processingErrorDetails
      });
      
      return updatedBill;

    } catch (error) {
      console.error(`❌ PDF processing failed for bill ${bill.messageId}:`, error);
      
      // Return bill with error status
      return {
        ...bill,
        pdfProcessingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process PDFs for multiple utility bills
   */
  async processPdfsForBills(bills: UtilityBill[]): Promise<UtilityBill[]> {
    console.log(`🔄 Processing PDFs for ${bills.length} bills...`);
    
    const processedBills: UtilityBill[] = [];
    
    for (const bill of bills) {
      if (bill.hasPdfAttachment) {
        const processedBill = await this.processPdfForBill(bill);
        processedBills.push(processedBill);
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        bill.pdfProcessingStatus = 'not_processed';
        processedBills.push(bill);
      }
    }
    
    console.log(`✅ PDF processing completed for ${processedBills.length} bills`);
    return processedBills;
  }
}

export const utilityService = new UtilityService(); 