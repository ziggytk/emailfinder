import OpenAI from 'openai';
import { chromium } from '@playwright/test';

export interface BrowserTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface OperatorSession {
  id: string;
  threadId: string;
  assistantId: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  lastActivity: string;
}

export class OperatorService {
  private openai: OpenAI;
  private assistantId: string = '';
  private sessions: Map<string, OperatorSession> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Initialize the Operator API assistant with browser tools
  async initializeAssistant(): Promise<string> {
    try {
      console.log('🤖 Initializing OpenAI Operator API assistant...');

      const tools: BrowserTool[] = [
        {
          type: 'function',
          function: {
            name: 'navigate_to_url',
            description: 'Navigate to a specific URL in the browser',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL to navigate to'
                }
              },
              required: ['url']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'take_screenshot',
            description: 'Take a screenshot of the current page',
            parameters: {
              type: 'object',
              properties: {
                fullPage: {
                  type: 'boolean',
                  description: 'Whether to take a full page screenshot',
                  default: false
                }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'get_page_info',
            description: 'Get current page URL and title',
            parameters: {
              type: 'object',
              properties: {}
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'click_element',
            description: 'Click on an element using CSS selector or text',
            parameters: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to find the element'
                },
                text: {
                  type: 'string',
                  description: 'Text content to find and click'
                }
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'fill_input',
            description: 'Fill an input field with text',
            parameters: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for the input field'
                },
                value: {
                  type: 'string',
                  description: 'Text to fill in the input'
                }
              },
              required: ['selector', 'value']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search_for_guest_payment',
            description: 'Search for guest payment options on utility websites',
            parameters: {
              type: 'object',
              properties: {
                searchTerms: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Terms to search for (e.g., "guest pay", "pay bill", "quick pay")'
                }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'fill_bill_details',
            description: 'Fill in bill payment details (account number, zip code)',
            parameters: {
              type: 'object',
              properties: {
                accountNumber: {
                  type: 'string',
                  description: 'Account number to fill'
                },
                zipCode: {
                  type: 'string',
                  description: 'Zip code to fill'
                }
              },
              required: ['accountNumber', 'zipCode']
            }
          }
        }
      ];

      const assistant = await this.openai.beta.assistants.create({
        name: 'Browser Automation Agent',
        instructions: `You are a browser automation agent that can control a web browser using Playwright. 

Your capabilities include:
- Navigating to web pages
- Taking screenshots
- Getting page content
- Clicking elements
- Filling forms
- Searching for specific content
- Waiting for elements to load

When helping users with utility bill payments:
1. Navigate to the utility company's website
2. Search for guest payment or quick pay options
3. Fill in the required bill details (account number, zip code)
4. Take screenshots to show progress
5. Provide clear status updates

Always be helpful, accurate, and provide detailed feedback about what you're doing.`,
        model: 'gpt-4o',
        tools: tools,
      });

      this.assistantId = assistant.id;
      console.log(`✅ OpenAI Assistant created with ID: ${this.assistantId}`);

      return this.assistantId;
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI assistant:', error);
      throw error;
    }
  }

  // Create a new operator session
  async createSession(userId: string, taskDescription: string): Promise<OperatorSession> {
    try {
      console.log('🎯 Creating new Operator API session...');

      // Initialize browser
      // await this.browserService.initialize(); // This line is removed

      // Create thread
      const thread = await this.openai.beta.threads.create({
        messages: [{
          role: 'user',
          content: taskDescription
        }]
      });

      const session: OperatorSession = {
        id: `session-${Date.now()}`,
        threadId: thread.id,
        assistantId: this.assistantId,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      this.sessions.set(session.id, session);
      console.log(`✅ Operator session created: ${session.id}`);

      return session;
    } catch (error) {
      console.error('❌ Failed to create operator session:', error);
      throw error;
    }
  }

  // Run the operator session (simplified version)
  async runSession(sessionId: string): Promise<any> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      console.log(`🚀 Running Operator session: ${sessionId}`);

      // For now, return a mock response indicating the session is ready
      // In a full implementation, this would handle the OpenAI run loop
      return {
        status: 'ready',
        message: 'Operator session is ready for tool execution',
        session: session,
        availableTools: [
          'navigate_to_url',
          'take_screenshot', 
          'get_page_info',
          'click_element',
          'fill_input',
          'search_for_guest_payment',
          'fill_bill_details'
        ]
      };

    } catch (error) {
      console.error('❌ Failed to run operator session:', error);
      throw error;
    }
  }

  // Execute browser tools directly (for testing)
  async executeTool(toolName: string, args: any): Promise<any> {
    try {
      console.log(`🔧 Executing tool: ${toolName}`);
      
      const result = await this.executeBrowserTool(toolName, args);
      console.log(`✅ Tool ${toolName} executed successfully`);
      
      return result;
    } catch (error) {
      console.error(`❌ Tool ${toolName} failed:`, error);
      throw error;
    }
  }

  // Execute browser tools
  private async executeBrowserTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'navigate_to_url':
        // const navResult = await this.browserService.navigateTo(args.url); // This line is removed
        return {
          success: true, // Mock success
          url: args.url,
          title: 'Mock Title', // Mock title
          error: null
        };

      case 'take_screenshot':
        // const screenshot = await this.browserService.takeScreenshot(args.fullPage || false); // This line is removed
        return {
          success: true,
          screenshot: 'mock_screenshot_data', // Mock screenshot data
          message: 'Screenshot taken successfully'
        };

      case 'get_page_info':
        // const pageInfo = await this.browserService.getPageInfo(); // This line is removed
        return {
          success: true,
          url: 'http://example.com', // Mock URL
          title: 'Mock Title' // Mock title
        };

      case 'click_element':
        // const clickSuccess = await this.browserService.clickElement(args.selector, args.text); // This line is removed
        return {
          success: true, // Mock success
          message: 'Element clicked successfully'
        };

      case 'fill_input':
        // const fillSuccess = await this.browserService.fillInput(args.selector, args.value); // This line is removed
        return {
          success: true, // Mock success
          message: 'Input filled successfully'
        };

      case 'search_for_guest_payment':
        return await this.searchForGuestPayment(args.searchTerms || ['guest pay', 'quick pay', 'pay bill']);

      case 'fill_bill_details':
        return await this.fillBillDetails(args.accountNumber, args.zipCode);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Search for guest payment options
  private async searchForGuestPayment(searchTerms: string[]): Promise<any> {
    try {
      console.log('🔍 Searching for guest payment options...');
      
      const selectors = [
        'a[href*="guest"]',
        'a[href*="quick"]',
        'a[href*="pay"]',
        'button:contains("guest")',
        'button:contains("quick pay")',
        'button:contains("pay bill")'
      ];

      for (const selector of selectors) {
        try {
          // const element = await this.browserService.searchForElement(selector); // This line is removed
          return {
            success: true,
            found: true,
            selector: selector,
            message: 'Guest payment option found'
          };
        } catch (error) {
          // Continue to next selector
        }
      }

      return {
        success: true,
        found: false,
        message: 'No guest payment options found with standard selectors'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  // Fill bill details
  private async fillBillDetails(accountNumber: string, zipCode: string): Promise<any> {
    try {
      console.log('✏️ Filling bill details...');
      
      const accountSelectors = [
        'input[name*="account"]',
        'input[id*="account"]',
        'input[placeholder*="account"]'
      ];

      const zipSelectors = [
        'input[name*="zip"]',
        'input[id*="zip"]',
        'input[placeholder*="zip"]'
      ];

      let accountFilled = false;
      for (const selector of accountSelectors) {
        // if (await this.browserService.fillInput(selector, accountNumber)) { // This line is removed
        accountFilled = true;
        break;
      }

      let zipFilled = false;
      for (const selector of zipSelectors) {
        // if (await this.browserService.fillInput(selector, zipCode)) { // This line is removed
        zipFilled = true;
        break;
      }

      return {
        success: accountFilled && zipFilled,
        accountFilled,
        zipFilled,
        message: `Account filled: ${accountFilled}, Zip filled: ${zipFilled}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fill bill details'
      };
    }
  }

  async navigateToHomepage(url: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log(`Navigating to: ${url}`);
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

      if (response && !response.ok()) {
        throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
      }

      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);

      await browser.close();

      return { success: true, url: currentUrl };
    } catch (error) {
      console.error('Navigation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Get session status
  getSession(sessionId: string): OperatorSession | undefined {
    return this.sessions.get(sessionId);
  }

  // List all sessions
  getAllSessions(): OperatorSession[] {
    return Array.from(this.sessions.values());
  }

  // Cleanup session
  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // await this.browserService.cleanup(); // This line is removed
      this.sessions.delete(sessionId);
      console.log(`🧹 Session ${sessionId} cleaned up`);
    }
  }

  // Interpret a static prompt and execute payment operations using Playwright
  async executePaymentOperation(): Promise<void> {
    const staticPrompt = "You are an expert payments operator whose job is to make a payment on behalf of a customer and document success. For any failures, you need to identify them to the user so they can manually fix them, with specific areas in which you need help.";

    try {
      // Send the static prompt to OpenAI to get a plan
      const response = await this.openai.completions.create({
        model: 'gpt-4',
        prompt: staticPrompt,
        max_tokens: 150,
      });

      if (response && response.choices && response.choices[0]) {
        const plan = response.choices[0].text.trim();
        console.log(`Generated Plan: ${plan}`);

        // Parse the plan and execute using Playwright
        const browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        // Example: Execute a simple navigation based on the plan
        if (plan.includes('navigate to')) {
          const urlMatch = plan.match(/navigate to (\S+)/);
          if (urlMatch) {
            const url = urlMatch[1];
            await page.goto(url);
            console.log(`Navigated to ${url}`);
          }
        }

        // Close the browser
        await browser.close();
      } else {
        console.error('Failed to generate a valid plan from OpenAI response.');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error executing payment operation:', error.message);
      } else {
        console.error('Unknown error executing payment operation:', error);
      }
    }
  }
}