import { chromium, Browser, Page } from 'playwright';
import { PageAnalyzer } from './pageAnalyzer';
import { AIDecisionService, AgentGoal } from './aiDecisionService';
import { ActionExecutor } from './actionExecutor';
import path from 'path';
import fs from 'fs';

export interface AgentResult {
  success: boolean;
  screenshots: string[];
  finalUrl: string;
  error?: string;
  actionHistory: string[];
  iterations: number;
  pausedForUser?: boolean;
  pauseReason?: string;
}

export class AgentOrchestrator {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private aiService: AIDecisionService;
  private screenshotDir: string;

  constructor(openaiApiKey: string, screenshotDir: string) {
    this.aiService = new AIDecisionService(openaiApiKey);
    this.screenshotDir = screenshotDir;

    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  }

  /**
   * Execute the agent goal
   */
  async execute(goal: AgentGoal): Promise<AgentResult> {
    const actionHistory: string[] = [];
    const screenshots: string[] = [];
    const sessionId = Date.now().toString();
    
    // Track form filling progress (deterministic)
    let formFillingState = {
      accountNumberFilled: false,
      zipCodeFilled: false,
      bankRoutingFilled: false,
      bankAccountFilled: false
    };

    try {
      console.log('🚀 Starting Agent Orchestrator');
      console.log('📋 Goal:', goal.type);
      console.log('🏢 Provider:', goal.context.provider);

      // Initialize browser
      await this.initBrowser();
      if (!this.page) throw new Error('Failed to initialize browser');

      // Step 1: Find provider's guest pay URL
      console.log('\n🔍 Step 1: Finding provider guest pay URL...');
      const startUrl = await this.aiService.findProviderGuestPayUrl(goal.context.provider);
      console.log('🌐 Starting URL:', startUrl);

      // Navigate to starting URL
      await this.page.goto(startUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      actionHistory.push(`Navigate to ${startUrl}`);

      // Take initial screenshot
      const initialScreenshot = path.join(this.screenshotDir, `${sessionId}-initial.png`);
      await ActionExecutor.takeScreenshot(this.page, initialScreenshot, true); // fullPage
      screenshots.push(initialScreenshot);

      // Main agent loop
      const maxIterations = 15;
      const maxTime = 60000; // 60 seconds
      const startTime = Date.now();
      let iteration = 0;
      let goalAchieved = false;

      console.log('\n🔄 Starting main agent loop...\n');

      while (iteration < maxIterations && Date.now() - startTime < maxTime && !goalAchieved) {
        iteration++;
        console.log(`\n--- Iteration ${iteration}/${maxIterations} ---`);

        // Analyze current page
        const pageContext = await PageAnalyzer.analyzePage(this.page);
        console.log(`📄 Current URL: ${pageContext.url}`);
        console.log(`📄 Page Title: ${pageContext.title}`);

        // Log page context for debugging
        console.log(`🔍 Links found (${pageContext.links.length}):`, pageContext.links.slice(0, 5).map(l => l.text));
        console.log(`📝 Inputs found (${pageContext.inputs.length}):`, pageContext.inputs.slice(0, 5).map(inp => `${inp.label || inp.placeholder || inp.id || inp.type}`));
        
        // **AUTO-DETECT GUEST PAY PAGE** - Transition from find_guest_pay_url to fill_bill_info
        if (goal.type === 'find_guest_pay_url') {
          // Check if we're on a guest pay page with required form fields
          const hasAccountField = pageContext.inputs.some((inp: any) => 
            (inp.label?.toLowerCase().includes('account') || 
            inp.placeholder?.toLowerCase().includes('account') ||
            inp.id?.toLowerCase().includes('account')) &&
            !inp.label?.toLowerCase().includes('routing') // Exclude routing number fields
          );
          
          const hasZipField = pageContext.inputs.some((inp: any) => 
            inp.label?.toLowerCase().includes('zip') || 
            inp.placeholder?.toLowerCase().includes('zip') ||
            inp.id?.toLowerCase().includes('zip') ||
            inp.id?.toLowerCase().includes('postal')
          );
          
          if (hasAccountField && hasZipField) {
            console.log('\n✅ Guest pay form detected! Transitioning to fill_bill_info goal...');
            console.log('   ✅ Account Number field found');
            console.log('   ✅ ZIP Code field found');
            
            // Transition to fill_bill_info goal
            goal = {
              type: 'fill_bill_info',
              context: goal.context
            };
            goalAchieved = false;
            continue; // Skip to next iteration with new goal
          }
        }
        
        // **DETERMINISTIC FORM FILLING** - Option A
        if (goal.type === 'fill_bill_info') {
          console.log('\n📝 Form filling mode - deterministic approach');
          console.log(`   Account Number filled: ${formFillingState.accountNumberFilled}`);
          console.log(`   ZIP Code filled: ${formFillingState.zipCodeFilled}`);
          
          // Fill account number first
          if (!formFillingState.accountNumberFilled) {
            const accountNumber = goal.context.accountNumber || '';
            // Remove dashes and spaces from account number (some forms don't accept them)
            const sanitizedAccountNumber = accountNumber.replace(/[-\s]/g, '');
            console.log(`🔢 Filling account number: ${accountNumber} → ${sanitizedAccountNumber}`);
            
            try {
              await ActionExecutor.executeAction(this.page, {
                type: 'type',
                target: 'Account Number',
                value: sanitizedAccountNumber
              });
              
              formFillingState.accountNumberFilled = true;
              actionHistory.push(`type: Account Number (${accountNumber})`);
              console.log('✅ Account number filled successfully');
              
              // Take screenshot
              const screenshot = path.join(this.screenshotDir, `${sessionId}-account-filled.png`);
              await ActionExecutor.takeScreenshot(this.page, screenshot, true);
              screenshots.push(screenshot);
              
              continue; // Next iteration will fill ZIP
            } catch (error) {
              console.error('❌ Failed to fill account number:', error);
              actionHistory.push(`ERROR filling account: ${error instanceof Error ? error.message : 'Unknown'}`);
              
              // Take error screenshot
              const errorScreenshot = path.join(this.screenshotDir, `${sessionId}-error-account.png`);
              await ActionExecutor.takeScreenshot(this.page, errorScreenshot, true);
              screenshots.push(errorScreenshot);
              
              // Continue to try ZIP anyway
            }
          }
          
          // Fill ZIP code second
          if (formFillingState.accountNumberFilled && !formFillingState.zipCodeFilled) {
            const zipCode = goal.context.zipCode || 
                           goal.context.billAddress?.match(/\b\d{5}\b/)?.[0] || '';
            console.log(`📮 Filling ZIP code: ${zipCode}`);
            
            try {
              await ActionExecutor.executeAction(this.page, {
                type: 'type',
                target: 'ZIP Code',
                value: zipCode
              });
              
              formFillingState.zipCodeFilled = true;
              actionHistory.push(`type: ZIP Code (${zipCode})`);
              console.log('✅ ZIP code filled successfully');
              
              // Take screenshot
              const screenshot = path.join(this.screenshotDir, `${sessionId}-zip-filled.png`);
              await ActionExecutor.takeScreenshot(this.page, screenshot, true);
              screenshots.push(screenshot);
              
              // Both fields filled - proceed to payment method selection
              console.log('\n💳 Step 3: Selecting payment method and submitting...');
              goal = {
                type: 'select_payment_method',
                context: goal.context
              };
              goalAchieved = false;
              continue;
            } catch (error) {
              console.error('❌ Failed to fill ZIP code:', error);
              actionHistory.push(`ERROR filling ZIP: ${error instanceof Error ? error.message : 'Unknown'}`);
              
              // Take error screenshot and pause anyway
              const errorScreenshot = path.join(this.screenshotDir, `${sessionId}-error-zip.png`);
              await ActionExecutor.takeScreenshot(this.page, errorScreenshot, true);
              screenshots.push(errorScreenshot);
              
              // Pause anyway - at least account number is filled
              console.log('\n⏸️  PAUSING (partial fill) for user...');
              return {
                success: true,
                screenshots,
                finalUrl: this.page.url(),
                actionHistory,
                iterations: iteration,
                pausedForUser: true,
                pauseReason: 'Partial form filled - user must complete and submit'
              };
            }
          }
          
          // Safety: Should not reach here
          console.log('⚠️ Unexpected state in form filling - pausing');
          goalAchieved = true;
          break;
        }

        // **DETERMINISTIC BANK ACCOUNT FILLING**
        if (goal.type === 'fill_bank_account') {
          console.log('\n💳 Bank account filling mode - deterministic approach');
          console.log(`   Routing Number filled: ${formFillingState.bankRoutingFilled}`);
          console.log(`   Account Number filled: ${formFillingState.bankAccountFilled}`);
          
          // Fill routing number first
          if (!formFillingState.bankRoutingFilled) {
            const routingNumber = goal.context.bankRoutingNumber || '';
            console.log(`🏦 Filling routing number: ${routingNumber}`);
            
            try {
              await ActionExecutor.executeAction(this.page, {
                type: 'type',
                target: 'Routing Number',
                value: routingNumber
              });
              
              formFillingState.bankRoutingFilled = true;
              actionHistory.push(`type: Routing Number (${routingNumber})`);
              console.log('✅ Routing number filled successfully');
              
              // Take screenshot
              const screenshot = path.join(this.screenshotDir, `${sessionId}-routing-filled.png`);
              await ActionExecutor.takeScreenshot(this.page, screenshot, true);
              screenshots.push(screenshot);
              
              continue; // Next iteration will fill account number
            } catch (error) {
              console.error('❌ Failed to fill routing number:', error);
              actionHistory.push(`ERROR filling routing: ${error instanceof Error ? error.message : 'Unknown'}`);
              
              // Take error screenshot
              const errorScreenshot = path.join(this.screenshotDir, `${sessionId}-error-routing.png`);
              await ActionExecutor.takeScreenshot(this.page, errorScreenshot, true);
              screenshots.push(errorScreenshot);
            }
          }
          
          // Fill bank account number second
          if (formFillingState.bankRoutingFilled && !formFillingState.bankAccountFilled) {
            const accountNumber = goal.context.bankAccountNumber || '';
            console.log(`💰 Filling bank account number: ${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`);
            
            try {
              await ActionExecutor.executeAction(this.page, {
                type: 'type',
                target: 'Account Number',
                value: accountNumber
              });
              
              formFillingState.bankAccountFilled = true;
              actionHistory.push(`type: Bank Account Number (***${accountNumber.slice(-4)})`);
              console.log('✅ Bank account number filled successfully');
              
              // Take screenshot
              const screenshot = path.join(this.screenshotDir, `${sessionId}-bank-account-filled.png`);
              await ActionExecutor.takeScreenshot(this.page, screenshot, true);
              screenshots.push(screenshot);
              
              // Both fields filled - pause for user to review and submit
              console.log('\n⏸️  PAUSING for user to review and submit payment...');
              
              // Take pause screenshot
              const pauseScreenshot = path.join(
                this.screenshotDir,
                `${sessionId}-paused-for-review.png`
              );
              await ActionExecutor.takeScreenshot(this.page, pauseScreenshot, true);
              screenshots.push(pauseScreenshot);
              
              return {
                success: true,
                screenshots,
                finalUrl: this.page.url(),
                actionHistory,
                iterations: iteration,
                pausedForUser: true,
                pauseReason: 'Bank account info filled - please review and submit payment'
              };
            } catch (error) {
              console.error('❌ Failed to fill bank account number:', error);
              actionHistory.push(`ERROR filling bank account: ${error instanceof Error ? error.message : 'Unknown'}`);
              
              // Take error screenshot and pause
              const errorScreenshot = path.join(this.screenshotDir, `${sessionId}-error-bank-account.png`);
              await ActionExecutor.takeScreenshot(this.page, errorScreenshot, true);
              screenshots.push(errorScreenshot);
              
              // Pause for user to complete manually
              console.log('\n⏸️  PAUSING (partial fill) for user...');
              return {
                success: true,
                screenshots,
                finalUrl: this.page.url(),
                actionHistory,
                iterations: iteration,
                pausedForUser: true,
                pauseReason: 'Partial bank account fill - user must complete and submit'
              };
            }
          }
          
          // Safety: Should not reach here
          console.log('⚠️ Unexpected state in bank account filling - pausing');
          goalAchieved = true;
          break;
        }
        
        // **AI-DRIVEN NAVIGATION** - For finding the guest pay page
        const decision = await this.aiService.getNextAction(
          pageContext,
          goal,
          actionHistory
        );

        console.log(`💭 AI Observation: ${decision.observation}`);
        console.log(`🧠 AI Reasoning: ${decision.reasoning}`);
        console.log(`🎯 Action: ${decision.action.type} - ${decision.action.target || decision.action.value || ''}`);
        console.log(`📊 Confidence: ${decision.confidence}%`);

        // Check if goal achieved
        if (decision.goalAchieved) {
          console.log('\n✅ Goal achieved!');
          
          // If we just found the guest pay page, proceed to fill the form
          if (goal.type === 'find_guest_pay_url') {
            console.log('\n📝 Step 2: Filling guest pay form (deterministic mode)...');
            goal = {
              type: 'fill_bill_info',
              context: goal.context
            };
            goalAchieved = false; // Continue with new goal
            continue;
          }
          
          // If we just selected payment method and submitted, fill bank account details
          if (goal.type === 'select_payment_method') {
            console.log('\n💰 Step 4: Filling bank account information...');
            
            // Bank account info should be passed via goal context
            if (!goal.context.bankAccountNumber || !goal.context.bankRoutingNumber) {
              console.error('❌ Bank account information not provided!');
              return {
                success: false,
                screenshots,
                finalUrl: this.page.url(),
                actionHistory,
                iterations: iteration,
                error: 'Bank account information not provided',
                pausedForUser: true,
                pauseReason: 'Bank account info missing - please add payment method to property'
              };
            }
            
            // Transition to fill_bank_account goal
            goal = {
              type: 'fill_bank_account',
              context: goal.context
            };
            goalAchieved = false;
            continue;
          }
          
          goalAchieved = true;
          break;
        }

        // Execute action
        try {
          await ActionExecutor.executeAction(this.page, decision.action);
          actionHistory.push(
            `${decision.action.type}: ${decision.action.target || decision.action.value || ''}`
          );

          // Take screenshot after action
          const actionScreenshot = path.join(
            this.screenshotDir,
            `${sessionId}-step-${iteration}.png`
          );
          await ActionExecutor.takeScreenshot(this.page, actionScreenshot, true); // fullPage
          screenshots.push(actionScreenshot);

        } catch (error) {
          console.error(`❌ Action failed at iteration ${iteration}:`, error);
          
          // Take error screenshot
          const errorScreenshot = path.join(
            this.screenshotDir,
            `${sessionId}-error-${iteration}.png`
          );
          await ActionExecutor.takeScreenshot(this.page, errorScreenshot, true); // fullPage
          screenshots.push(errorScreenshot);

          // Continue to next iteration instead of failing immediately
          actionHistory.push(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Take final screenshot
      const finalScreenshot = path.join(this.screenshotDir, `${sessionId}-final.png`);
      await ActionExecutor.takeScreenshot(this.page, finalScreenshot, true);
      screenshots.push(finalScreenshot);

      const finalUrl = this.page.url();

      // Close browser
      await this.closeBrowser();

      // Determine success
      const success = goalAchieved || iteration < maxIterations;

      console.log('\n📊 Agent Execution Summary:');
      console.log(`✅ Success: ${success}`);
      console.log(`🔄 Iterations: ${iteration}`);
      console.log(`📸 Screenshots: ${screenshots.length}`);
      console.log(`🌐 Final URL: ${finalUrl}`);
      console.log(`📝 Actions: ${actionHistory.join(' → ')}`);

      return {
        success,
        screenshots,
        finalUrl,
        actionHistory,
        iterations: iteration,
        error: success ? undefined : 'Goal not achieved within iteration/time limits'
      };

    } catch (error) {
      console.error('❌ Agent execution failed:', error);
      
      // Try to take error screenshot
      if (this.page) {
        try {
          const errorScreenshot = path.join(this.screenshotDir, `${sessionId}-fatal-error.png`);
          await ActionExecutor.takeScreenshot(this.page, errorScreenshot, true); // fullPage
          screenshots.push(errorScreenshot);
        } catch (screenshotError) {
          console.error('Could not capture error screenshot:', screenshotError);
        }
      }

      await this.closeBrowser();

      return {
        success: false,
        screenshots,
        finalUrl: this.page?.url() || '',
        actionHistory,
        iterations: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initialize Playwright browser
   */
  private async initBrowser(): Promise<void> {
    console.log('🌐 Launching browser...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.page = await context.newPage();
    
    // Set default timeout
    this.page.setDefaultTimeout(30000);

    console.log('✅ Browser launched successfully');
  }

  /**
   * Close browser and cleanup
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('🔒 Browser closed');
    }
  }
}

