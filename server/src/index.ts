import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
// Remove Playwright-related imports
// import { AgentService } from './services/agentService';
// import { BrowserService } from './services/browserService';
import { OperatorService } from './services/operatorService';
import { AgentOrchestrator } from './services/agentOrchestrator';
import { AgentGoal } from './services/aiDecisionService';
import StripeService from './services/stripeService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Initialize Agent Service
// Remove Playwright-related code
// const agentService = new AgentService();
const operatorService = new OperatorService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Remove launch agent-related endpoints
// app.post('/api/agent/launch', async (req, res) => {
//   // Launch agent logic
// });

// app.get('/api/agent/session/:sessionId', async (req, res) => {
//   // Get agent session logic
// });

// app.get('/api/agent/sessions', async (req, res) => {
//   // Get agent sessions logic
// });

// ===== OPERATOR API ENDPOINTS =====

// Initialize Operator API assistant
app.post('/api/operator/initialize', async (req, res) => {
  try {
    console.log('🤖 Initializing Operator API assistant...');
    const assistantId = await operatorService.initializeAssistant();
    
    res.json({
      success: true,
      assistantId,
      message: 'Operator API assistant initialized successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to initialize Operator API:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error initializing Operator API:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize Operator API'
      });
    }
  }
});

// Create Operator session
app.post('/api/operator/session', async (req, res) => {
  try {
    const { userId, taskDescription } = req.body;
    
    if (!userId || !taskDescription) {
      return res.status(400).json({
        success: false,
        error: 'userId and taskDescription are required'
      });
    }

    console.log('🎯 Creating Operator session...');
    const session = await operatorService.createSession(userId, taskDescription);
    
    res.json({
      success: true,
      session,
      message: 'Operator session created successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to create Operator session:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error creating Operator session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create Operator session'
      });
    }
  }
});

// Run Operator session
app.post('/api/operator/session/:sessionId/run', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`🚀 Running Operator session: ${sessionId}`);
    const result = await operatorService.runSession(sessionId);
    
    res.json({
      success: true,
      result,
      message: 'Operator session completed'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to run Operator session:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error running Operator session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run Operator session'
      });
    }
  }
});

// Get Operator session
app.get('/api/operator/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = operatorService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to get Operator session:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error getting Operator session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Operator session'
      });
    }
  }
});

// List all Operator sessions
app.get('/api/operator/sessions', async (req, res) => {
  try {
    const sessions = operatorService.getAllSessions();
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to get Operator sessions:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error getting Operator sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Operator sessions'
      });
    }
  }
});

// Execute Operator tool directly
app.post('/api/operator/execute-tool', async (req, res) => {
  try {
    const { sessionId, toolName, args } = req.body;
    
    if (!sessionId || !toolName) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and toolName are required'
      });
    }

    console.log(`🔧 Executing tool: ${toolName}`);
    const result = await operatorService.executeTool(toolName, args || {});
    
    res.json({
      success: true,
      result,
      message: `Tool ${toolName} executed successfully`
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to execute tool:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error executing tool:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute tool'
      });
    }
  }
});

// Cleanup Operator session
app.delete('/api/operator/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await operatorService.cleanupSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session cleaned up successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to cleanup Operator session:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('❌ Unknown error cleaning up Operator session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup Operator session'
      });
    }
  }
});

// Endpoint to navigate to utility provider homepage
app.post('/api/operator/navigate-homepage', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const result = await operatorService.navigateToHomepage(url);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to navigate to homepage:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      console.error('Failed to navigate to homepage:', error);
      res.status(500).json({ success: false, error: 'Failed to navigate to homepage' });
    }
  }
});

// Export the executePaymentOperation method for external use
export const executePaymentOperation = operatorService.executePaymentOperation.bind(operatorService);

// ===== STRIPE BANK ACCOUNT ENDPOINTS =====

// Create bank account token and store it
app.post('/api/stripe/create-bank-token', async (req, res) => {
  try {
    const { propertyId, accountNumber, routingNumber, accountHolderName, accountHolderType = 'individual' } = req.body;
    const userId = req.body.userId; // Get from auth token in production

    // Validation
    if (!propertyId || !accountNumber || !routingNumber || !accountHolderName || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, accountNumber, routingNumber, accountHolderName, userId'
      });
    }

    // Validate routing number
    if (!StripeService.isValidRoutingNumber(routingNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid routing number format'
      });
    }

    // Validate account number
    if (!StripeService.isValidAccountNumber(accountNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account number format (must be 4-17 digits)'
      });
    }

    console.log('🏦 Creating bank account token for property:', propertyId);

    // Create Stripe token
    const tokenResult = await StripeService.createBankAccountToken({
      accountNumber,
      routingNumber,
      accountHolderName,
      accountHolderType
    });

    // Encrypt account number using AES-256-CBC
    const { encrypt } = await import('./utils/encryption');
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-CHANGE-IN-PRODUCTION';
    const encryptedAccount = encrypt(accountNumber, encryptionKey);

    // Store token in Supabase (upsert to replace existing)
    const { data, error } = await supabase
      .from('property_bank_accounts')
      .upsert({
        user_id: userId,
        property_id: propertyId,
        stripe_token_id: tokenResult.tokenId,
        bank_name: tokenResult.bankName,
        account_last4: tokenResult.last4,
        account_holder_name: accountHolderName,
        routing_number: routingNumber,
        encrypted_account_number: encryptedAccount  // Store encrypted full account
      }, {
        onConflict: 'property_id'
      })
      .select();

    if (error) {
      console.error('❌ Failed to store bank token in database:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to store bank account information'
      });
    }

    // Get the first item from the array (upsert returns an array)
    const savedAccount = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    if (!savedAccount) {
      console.error('❌ No data returned from upsert');
      return res.status(500).json({
        success: false,
        error: 'Failed to save bank account - no data returned'
      });
    }

    console.log('✅ Bank account token stored successfully');

    res.json({
      success: true,
      data: {
        id: savedAccount.id,
        bankName: savedAccount.bank_name,
        accountLast4: savedAccount.account_last4,
        accountHolderName: savedAccount.account_holder_name,
        routingNumber: savedAccount.routing_number
      }
    });

  } catch (error) {
    console.error('❌ Failed to create bank token:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create bank token'
    });
  }
});

// Get bank account details for a property
app.get('/api/stripe/bank-details/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.query.userId as string; // Get from auth token in production

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log('🔍 Fetching bank details for property:', propertyId);

    // Fetch from database
    const { data, error } = await supabase
      .from('property_bank_accounts')
      .select('*')
      .eq('property_id', propertyId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'No bank account found for this property'
      });
    }

    // Fetch full details from Stripe (routing + account for payment)
    const stripeDetails = await StripeService.getBankAccountDetails(data.stripe_token_id);

    res.json({
      success: true,
      data: {
        id: data.id,
        bankName: data.bank_name,
        accountLast4: data.account_last4,
        accountHolderName: data.account_holder_name,
        routingNumber: stripeDetails.routingNumber, // Full routing number from Stripe
        // Note: We never return the full account number for security
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch bank details:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bank details'
    });
  }
});

// Delete bank account token
app.delete('/api/stripe/bank-token/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.body.userId; // Get from auth token in production

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log('🗑️  Deleting bank token for property:', propertyId);

    const { error } = await supabase
      .from('property_bank_accounts')
      .delete()
      .eq('property_id', propertyId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to delete bank token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete bank account'
      });
    }

    console.log('✅ Bank token deleted successfully');

    res.json({
      success: true,
      message: 'Bank account removed successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete bank token:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete bank token'
    });
  }
});

// ===== AI AGENT ENDPOINTS =====

// Launch AI Agent to navigate and pay bill
app.post('/api/agent/navigate', async (req, res) => {
  try {
    const { billData, userToken } = req.body;

    if (!billData) {
      return res.status(400).json({
        success: false,
        error: 'billData is required'
      });
    }

    console.log('🚀 Launching AI Agent for bill payment...');
    console.log('📋 Provider:', billData.utilityProvider);
    console.log('💰 Amount:', billData.totalAmountDue);

    // Create screenshot directory
    const screenshotDir = path.join(__dirname, '../screenshots');

    // Initialize agent orchestrator
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const agent = new AgentOrchestrator(openaiApiKey, screenshotDir);

    // Extract ZIP code from bill address (look for 5-digit ZIP)
    // Try multiple fields and patterns
    const zipCodeMatch = 
      billData.homeAddress?.match(/\b\d{5}(?:-\d{4})?\b/) || 
      billData.matchedPropertyAddress?.match(/\b\d{5}(?:-\d{4})?\b/);
    
    // Extract just the 5-digit ZIP (remove -XXXX if present)
    const zipCode = zipCodeMatch ? zipCodeMatch[0].split('-')[0] : undefined;

    console.log('📍 Bill data addresses:', {
      homeAddress: billData.homeAddress,
      matchedPropertyAddress: billData.matchedPropertyAddress
    });
    console.log('📍 Extracted ZIP:', zipCode);
    console.log('🔢 Account Number:', billData.accountNumber);

    // Retrieve bank account information from Stripe
    let bankAccountNumber: string | undefined;
    let bankRoutingNumber: string | undefined;

    if (billData.associatedPropertyId) {
      console.log('🏦 Retrieving bank account info for property:', billData.associatedPropertyId);
      try {
        const bankDetails = await StripeService.getBankAccountDetailsFromDB(billData.associatedPropertyId);
        if (bankDetails && bankDetails.accountNumber) {
          bankAccountNumber = bankDetails.accountNumber;
          bankRoutingNumber = bankDetails.routingNumber;
          console.log(`✅ Bank account retrieved: ***${bankDetails.last4} (Routing: ${bankRoutingNumber})`);
        } else {
          console.warn('⚠️ No bank account found for this property');
        }
      } catch (error) {
        console.error('❌ Failed to retrieve bank account:', error);
        console.warn('⚠️ Continuing without bank account info - agent will pause for user input');
      }
    } else {
      console.warn('⚠️ No property associated with this bill - cannot retrieve bank account');
    }

    // Define goal
    const goal: AgentGoal = {
      type: 'find_guest_pay_url',
      context: {
        provider: billData.utilityProvider || 'Unknown Provider',
        accountNumber: billData.accountNumber,
        zipCode: zipCode,
        billAmount: billData.totalAmountDue?.toString(),
        dueDate: billData.billDueDate,
        billAddress: billData.serviceAddress || billData.billAddress,
        bankAccountNumber,
        bankRoutingNumber
      }
    };

    // Execute agent
    const result = await agent.execute(goal);

    res.json({
      success: result.success,
      screenshots: result.screenshots.map(s => s.replace(screenshotDir, '')), // Return relative paths
      finalUrl: result.finalUrl,
      actionHistory: result.actionHistory,
      iterations: result.iterations,
      error: result.error
    });

  } catch (error) {
    console.error('❌ Agent navigation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Agent execution failed'
    });
  }
});

// Get screenshot file
app.get('/api/agent/screenshot/*', (req, res) => {
  try {
    const screenshotPath = (req.params as any)[0] as string;
    const fullPath = path.join(__dirname, '../screenshots', screenshotPath);
    res.sendFile(fullPath);
  } catch (error) {
    console.error('❌ Failed to send screenshot:', error);
    res.status(404).json({ success: false, error: 'Screenshot not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Utility Agent Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agent launch: http://localhost:${PORT}/api/agent/launch`);
  console.log(`📋 Agent sessions: http://localhost:${PORT}/api/agent/sessions`);
  console.log(`🧠 Operator API initialize: http://localhost:${PORT}/api/operator/initialize`);
  console.log(`🎯 Operator sessions: http://localhost:${PORT}/api/operator/sessions`);
});

export default app;
