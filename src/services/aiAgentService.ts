import { supabase } from './supabaseClient';

export interface AgentAction {
  type: 'navigate' | 'complete';
  url?: string;
  message: string;
  details?: string;
  status: 'pending' | 'success' | 'error';
}

export interface AgentResponse {
  success: boolean;
  action: AgentAction;
  error?: string;
}

export class AIAgentService {
  private static async callOpenAI(prompt: string, billData: any): Promise<AgentResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an AI agent that helps users navigate to utility provider websites. 
              You should respond with JSON in this exact format:
              {
                "action": {
                  "type": "navigate",
                  "url": "https://provider-website.com",
                  "message": "Navigating to [Provider Name]",
                  "details": "Provider website URL determined from bill data",
                  "status": "success"
                }
              }
              
              Look for provider names in the bill data and return the appropriate website URL.`
            },
            {
              role: 'user',
              content: `${prompt}\n\nBill Data: ${JSON.stringify(billData, null, 2)}`
            }
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }
      
      if (!parsedResponse.action || !parsedResponse.action.type) {
        throw new Error('Invalid response format from OpenAI');
      }
      
      return {
        success: true,
        action: parsedResponse.action,
      };
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return {
        success: false,
        action: {
          type: 'complete',
          message: 'Failed to process agent request',
          details: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async navigateToProvider(billData: any): Promise<AgentResponse> {
    const prompt = `Based on the bill data, determine the utility provider's website URL.
    
    Look for provider names in:
    - Bill header/footer
    - Account information
    - Contact details
    - Company logos or branding
    
    Common utility providers and their URLs:
    - ConEdison/Con Edison: https://www.coned.com
    - National Grid: https://www.nationalgridus.com
    - PSEG: https://www.pseg.com
    - Duke Energy: https://www.duke-energy.com
    - PG&E/Pacific Gas & Electric: https://www.pge.com
    - Southern California Edison/SCE: https://www.sce.com
    - Eversource: https://www.eversource.com
    - Dominion Energy: https://www.dominionenergy.com
    - Xcel Energy: https://www.xcelenergy.com
    - Ameren: https://www.ameren.com
    - FirstEnergy: https://www.firstenergycorp.com
    - Entergy: https://www.entergy.com
    
    If you can't determine the provider from the bill data, use a generic utility provider URL like https://www.utilityprovider.com
    
    Respond with a navigation action to the appropriate provider website. Include the provider name in the message.`;

    return this.callOpenAI(prompt, billData);
  }
}
