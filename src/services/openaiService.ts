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
              content: `You are an expert at extracting utility bill information from images and determining if bills belong to specific properties. 
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
              - propertyAssociationScore: Your confidence that this bill belongs to one of the provided property addresses (0-100, where 100 is completely certain it belongs)
              - associatedPropertyAddress: The property address this bill belongs to, or null if propertyAssociationScore < 75
              - utilityProvider: The utility provider name from the bill (text)
              
              For confidenceScore, consider:
              - Image clarity and readability
              - Completeness of information visible
              - Consistency of data across the bill
              - Any unclear or missing fields
              
              For propertyAssociationScore, determine if this bill belongs to one of the provided properties:
              - 100: Certain this bill belongs to the property (exact address match)
              - 90-99: Very confident this bill belongs to the property (minor address differences like "Rd" vs "Road")
              - 80-89: Confident this bill belongs to the property (same street, city, state, zip with variations)
              - 75-79: Reasonably confident this bill belongs to the property (same location with some differences)
              - 0-74: Not confident this bill belongs to any of the provided properties
              
              For associatedPropertyAddress, return the property address this bill belongs to, or -1 if propertyAssociationScore < 75.
              
              IMPORTANT: You MUST provide both propertyAssociationScore and associatedPropertyAddress in your response, even if no property addresses are provided (in which case use 0 for propertyAssociationScore and null for associatedPropertyAddress).
              
              If any information is not clearly visible or cannot be determined, use null for that field.
              Return ONLY the JSON object, no additional text or explanation.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please extract the bill information from this image and determine if this bill belongs to one of the following properties:
                  
Properties to check against:
${request.propertyAddresses && request.propertyAddresses.length > 0 
  ? request.propertyAddresses.map((addr, index) => `${index + 1}. ${addr}`).join('\n')
  : 'No properties provided'
}

Utility providers to check against:
${request.utilityProviders && request.utilityProviders.length > 0 
  ? request.utilityProviders.map((provider, index) => `${index + 1}. ${provider}`).join('\n')
  : 'No utility providers provided'
}

IMPORTANT: You MUST include propertyAssociationScore (0-100), associatedPropertyAddress, and utilityProvider in your JSON response. If no properties are provided, use propertyAssociationScore: 0 and associatedPropertyAddress: null. Extract the utility provider name from the bill image.`
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
      console.log('🔍 Property addresses provided:', request.propertyAddresses);

      // Parse the JSON response
      let extractedData;
      try {
              // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON match:', parseError);
          throw new Error('OpenAI returned invalid JSON format');
        }
      } else {
        // If no JSON found, OpenAI couldn't extract bill data
        console.log('⚠️ OpenAI could not extract bill data from image');
        console.log('📄 OpenAI response:', content);
        throw new Error('Unable to extract bill information from this image. Please try a different image.');
      }
        console.log('🔍 Parsed extracted data:', extractedData);
        console.log('🔍 Property association fields in parsed data:', {
          propertyAssociationScore: extractedData.propertyAssociationScore,
          associatedPropertyAddress: extractedData.associatedPropertyAddress,
          hasPropertyAssociationScore: 'propertyAssociationScore' in extractedData,
          hasAssociatedPropertyAddress: 'associatedPropertyAddress' in extractedData
        });
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI response:', parseError);
        console.error('❌ Raw content that failed to parse:', content);
        throw new Error('Failed to parse extracted data from OpenAI');
      }

      // Use property association values from OpenAI response
      const extractedAddress = extractedData.homeAddress || 'Unknown';
      const propertyAssociationScore = parseFloat(extractedData.propertyAssociationScore) || 0;
      const associatedPropertyAddress = extractedData.associatedPropertyAddress || undefined;
      
      console.log('🏠 Extracted address from bill:', extractedAddress);
      console.log('📊 Property association score from OpenAI:', extractedData.propertyAssociationScore);
      console.log('🎯 Parsed property association score:', propertyAssociationScore);
      console.log('📍 Associated property address from OpenAI:', extractedData.associatedPropertyAddress);
      console.log('🎯 Final associated property address:', associatedPropertyAddress);

      // Validate and create the bill data object
      const billData: BillData = {
        id: crypto.randomUUID(),
        imageUrl: request.imageUrl,
        ownerName: extractedData.ownerName || 'Unknown',
        homeAddress: extractedAddress,
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
        addressMatchScore: propertyAssociationScore,
        matchedPropertyAddress: associatedPropertyAddress,
        utilityProvider: extractedData.utilityProvider || undefined,
        status: 'pending',
        wasEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Bill data extracted successfully:', billData);
      console.log('🏠 Final address match score in bill data:', billData.addressMatchScore);
      console.log('📍 Final matched property address in bill data:', billData.matchedPropertyAddress);

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
