import { UtilityProvider, UtilityBill, BillSearchResult } from '../types/utility';
import { gmailApiService } from './gmailApi';
import { ParsedEmail } from '../types/email';

// Predefined utility providers
const DEFAULT_UTILITY_PROVIDERS: UtilityProvider[] = [
  {
    id: 'coned',
    name: 'ConEdison',
    domains: ['coned.com', 'conedison.com'],
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

      // Phase 2: Get emails from utility providers (no attachment filter yet)
      const providerEmails = await gmailApiService.searchMessages(searchQuery, 200);
      console.log(`📧 Phase 2: Found ${providerEmails.length} emails from utility providers`);

      // Phase 3: Filter for emails with attachments
      const emailsWithAttachments: ParsedEmail[] = [];
      
      for (const email of providerEmails) {
        // Check if email has attachments or mentions PDF in subject
        if (email.hasAttachments || 
            email.subject.toLowerCase().includes('pdf') ||
            email.subject.toLowerCase().includes('bill')) {
          emailsWithAttachments.push(email);
        }
      }

      console.log(`📎 Phase 3: Found ${emailsWithAttachments.length} emails with potential attachments`);

      // Phase 4: Process emails and create utility bills
      const utilityBills: UtilityBill[] = [];
      
      for (const message of emailsWithAttachments) {
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
          
          const bill: UtilityBill = {
            id: `${message.id}-${matchingProvider.id}`,
            messageId: message.id,
            provider: matchingProvider,
            subject: message.subject,
            from: message.from,
            date: message.date,
            hasPdfAttachment: message.hasAttachments || message.subject.toLowerCase().includes('pdf'),
            amount: amountMatch ? amountMatch[1] : undefined,
            billNumber: billNumberMatch ? billNumberMatch[1] : undefined
          };

          utilityBills.push(bill);
        }
      }

      console.log(`✅ Phase 4: Found ${utilityBills.length} utility bills`);

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
}

export const utilityService = new UtilityService(); 