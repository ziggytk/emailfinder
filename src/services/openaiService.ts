import { BillData, BillExtractionRequest, BillExtractionResponse } from '../types/bill';

export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  }

  /**
   * Extract bill information from an image using OpenAI Vision API
   */
  async extractBillData(request: BillExtractionRequest): Promise<BillExtractionResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('🔍 Starting bill data extraction from image:', request.imageUrl);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting utility bill information from images. 
              Extract the following information from the provided image and return it as a JSON object:
              
              Required fields:
              - ownerName: The name of the bill owner (text)
              - homeAddress: The home address (text)
              - accountNumber: The account number on the bill (text)
              - billDueDate: The bill due date (YYYY-MM-DD format)
              - isAutoPayEnabled: Whether auto pay is enabled (true/false)
              - averageDailyElectricUsage: Average daily electric usage in kWh (decimal number)
              - nextBillingDate: The next billing date (YYYY-MM-DD format)
              - billingPeriodStart: Start date of billing period (YYYY-MM-DD format)
              - billingPeriodEnd: End date of billing period (YYYY-MM-DD format)
              - billingDays: Number of days in billing period (integer)
              - totalAmountDue: Total amount due in dollars (decimal number)
              - confidenceScore: Your confidence in the extraction accuracy (0-100, where 100 is completely confident)
              
              For confidenceScore, consider:
              - Image clarity and readability
              - Completeness of information visible
              - Consistency of data across the bill
              - Any unclear or missing fields
              
              If any information is not clearly visible or cannot be determined, use null for that field.
              Return ONLY the JSON object, no additional text or explanation.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract the bill information from this image:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: request.imageUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI API');
      }

      console.log('📄 Raw OpenAI response:', content);

      // Parse the JSON response
      let extractedData;
      try {
        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          extractedData = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI response:', parseError);
        throw new Error('Failed to parse extracted data from OpenAI');
      }

      // Validate and create the bill data object
      const billData: BillData = {
        id: crypto.randomUUID(),
        imageUrl: request.imageUrl,
        ownerName: extractedData.ownerName || 'Unknown',
        homeAddress: extractedData.homeAddress || 'Unknown',
        accountNumber: extractedData.accountNumber || 'Unknown',
        billDueDate: extractedData.billDueDate || new Date().toISOString().split('T')[0],
        isAutoPayEnabled: extractedData.isAutoPayEnabled || false,
        averageDailyElectricUsage: parseFloat(extractedData.averageDailyElectricUsage) || 0,
        nextBillingDate: extractedData.nextBillingDate || new Date().toISOString().split('T')[0],
        billingPeriodStart: extractedData.billingPeriodStart || new Date().toISOString().split('T')[0],
        billingPeriodEnd: extractedData.billingPeriodEnd || new Date().toISOString().split('T')[0],
        billingDays: parseInt(extractedData.billingDays) || 0,
        totalAmountDue: parseFloat(extractedData.totalAmountDue) || 0,
        confidenceScore: parseFloat(extractedData.confidenceScore) || 0,
        status: 'pending',
        wasEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Bill data extracted successfully:', billData);

      return {
        success: true,
        data: billData
      };

    } catch (error) {
      console.error('❌ Bill data extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const openaiService = new OpenAIService();
