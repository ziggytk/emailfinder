import { BrowserService } from './browserService';
import { createClient } from '@supabase/supabase-js';

export interface AgentSession {
  id: string;
  userId: string;
  billId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillData {
  id: string;
  utilityProvider: string;
  totalAmountDue: number;
  billDueDate: string;
  accountNumber: string;
  homeAddress: string;
}

export class AgentService {
  private browserService: BrowserService;
  private supabase: any;

  constructor() {
    this.browserService = new BrowserService();
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  async launchAgent(billId: string, userId: string): Promise<AgentSession> {
    try {
      console.log(`🤖 Launching agent for bill ${billId}, user ${userId}`);

      // Create agent session in database
      const session: AgentSession = {
        id: `session-${Date.now()}`,
        userId,
        billId,
        status: 'running',
        progress: 0,
        currentStep: 'Initializing browser...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save session to database
      await this.saveAgentSession(session);

      // Initialize browser
      await this.browserService.initialize();
      await this.updateSessionProgress(session.id, 25, 'Browser initialized');

      // Get bill data from database
      const billData = await this.getBillData(billId);
      if (!billData) {
        throw new Error('Bill data not found');
      }

      await this.updateSessionProgress(session.id, 50, 'Bill data retrieved');

      // Navigate to utility provider website
      const utilityUrl = this.getUtilityProviderUrl(billData.utilityProvider);
      await this.browserService.navigateTo(utilityUrl);
      await this.updateSessionProgress(session.id, 75, 'Navigated to utility website');

      // Take screenshot for debugging
      const screenshotPath = await this.browserService.takeScreenshot(`bill-${billId}-${Date.now()}.png`);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Complete session
      await this.updateSessionProgress(session.id, 100, 'Agent completed successfully');
      await this.updateSessionStatus(session.id, 'completed');

      return session;

    } catch (error) {
      console.error('❌ Agent launch failed:', error);
      
      // Update session with error
      if (session) {
        await this.updateSessionStatus(session.id, 'failed', error.message);
      }
      
      throw error;
    } finally {
      // Cleanup browser
      await this.browserService.cleanup();
    }
  }

  private async saveAgentSession(session: AgentSession): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('agent_sessions')
        .insert([session]);

      if (error) {
        console.error('❌ Failed to save agent session:', error);
        throw error;
      }

      console.log('✅ Agent session saved to database');
    } catch (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
  }

  private async updateSessionProgress(sessionId: string, progress: number, currentStep: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('agent_sessions')
        .update({ 
          progress, 
          currentStep, 
          updatedAt: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Failed to update session progress:', error);
      } else {
        console.log(`📊 Session ${sessionId} progress: ${progress}% - ${currentStep}`);
      }
    } catch (error) {
      console.error('❌ Database error:', error);
    }
  }

  private async updateSessionStatus(sessionId: string, status: string, error?: string): Promise<void> {
    try {
      const updateData: any = { 
        status, 
        updatedAt: new Date().toISOString() 
      };

      if (error) {
        updateData.error = error;
      }

      const { error: dbError } = await this.supabase
        .from('agent_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (dbError) {
        console.error('❌ Failed to update session status:', dbError);
      } else {
        console.log(`📊 Session ${sessionId} status updated: ${status}`);
      }
    } catch (error) {
      console.error('❌ Database error:', error);
    }
  }

  private async getBillData(billId: string): Promise<BillData | null> {
    try {
      const { data, error } = await this.supabase
        .from('bill_extractions')
        .select('*')
        .eq('id', billId)
        .single();

      if (error) {
        console.error('❌ Failed to get bill data:', error);
        return null;
      }

      return {
        id: data.id,
        utilityProvider: data.utility_provider,
        totalAmountDue: data.total_amount_due,
        billDueDate: data.bill_due_date,
        accountNumber: data.account_number,
        homeAddress: data.home_address
      };
    } catch (error) {
      console.error('❌ Database error:', error);
      return null;
    }
  }

  private getUtilityProviderUrl(provider: string): string {
    // Map utility providers to their websites
    const providerUrls: { [key: string]: string } = {
      'ConEd': 'https://www.coned.com',
      'PSEG': 'https://www.pseg.com',
      'National Grid': 'https://www.nationalgrid.com',
      'Dominion Energy': 'https://www.dominionenergy.com',
      'Duke Energy': 'https://www.duke-energy.com',
      'Southern Company': 'https://www.southerncompany.com',
      'Exelon': 'https://www.exeloncorp.com',
      'NextEra Energy': 'https://www.nexteraenergy.com',
      'American Electric Power': 'https://www.aep.com',
      'Xcel Energy': 'https://www.xcelenergy.com'
    };

    return providerUrls[provider] || 'https://www.google.com';
  }

  async getAgentSession(sessionId: string): Promise<AgentSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('agent_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('❌ Failed to get agent session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Database error:', error);
      return null;
    }
  }

  async getAgentSessions(userId: string): Promise<AgentSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_sessions')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('❌ Failed to get agent sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Database error:', error);
      return [];
    }
  }
}

