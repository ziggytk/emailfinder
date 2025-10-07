import { BillData } from '../types/bill';

const API_BASE_URL = 'http://localhost:3000';

export interface AgentNavigateResponse {
  success: boolean;
  screenshots: string[];
  finalUrl: string;
  actionHistory: string[];
  iterations: number;
  error?: string;
  pausedForUser?: boolean;
  pauseReason?: string;
}

export class AgentApiService {
  /**
   * Launch AI agent to navigate to utility provider and find guest pay page
   */
  async launchAgent(billData: BillData, userToken?: string): Promise<AgentNavigateResponse> {
    try {
      console.log('🚀 Calling agent API...', { provider: billData.utilityProvider });

      const response = await fetch(`${API_BASE_URL}/api/agent/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken && { 'Authorization': `Bearer ${userToken}` })
        },
        body: JSON.stringify({
          billData: {
            utilityProvider: billData.utilityProvider,
            accountNumber: billData.accountNumber,
            totalAmountDue: billData.totalAmountDue,
            billDueDate: billData.billDueDate,
            homeAddress: billData.homeAddress,
            ownerName: billData.ownerName
          },
          userToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data: AgentNavigateResponse = await response.json();
      
      console.log('✅ Agent response:', {
        success: data.success,
        iterations: data.iterations,
        finalUrl: data.finalUrl
      });

      return data;
    } catch (error) {
      console.error('❌ Agent API call failed:', error);
      throw error;
    }
  }

  /**
   * Get screenshot URL from server
   */
  getScreenshotUrl(screenshotPath: string): string {
    // Remove leading slash if present
    const cleanPath = screenshotPath.startsWith('/') ? screenshotPath.substring(1) : screenshotPath;
    return `${API_BASE_URL}/api/agent/screenshot/${cleanPath}`;
  }
}

export const agentApiService = new AgentApiService();

