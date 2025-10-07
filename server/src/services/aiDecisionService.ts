import OpenAI from 'openai';
import { PageContext } from './pageAnalyzer';

export interface AgentGoal {
  type: 'find_guest_pay_url' | 'navigate_to_guest_pay' | 'fill_bill_info' | 'select_payment_method' | 'fill_bank_account' | 'make_payment';
  context: {
    provider: string;
    accountNumber?: string;
    billAmount?: string;
    dueDate?: string;
    zipCode?: string;
    billAddress?: string;
    bankAccountNumber?: string;
    bankRoutingNumber?: string;
  };
}

export interface AgentAction {
  type: 'click' | 'type' | 'navigate' | 'wait' | 'scroll';
  target?: string;
  value?: string;
}

export interface AIDecision {
  observation: string;
  reasoning: string;
  action: AgentAction;
  goalAchieved: boolean;
  confidence: number;
}

export class AIDecisionService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Ask AI to determine the next action based on current page context
   */
  async getNextAction(
    pageContext: PageContext,
    goal: AgentGoal,
    actionHistory: string[]
  ): Promise<AIDecision> {
    const prompt = this.buildPrompt(pageContext, goal, actionHistory);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an intelligent web automation agent. Your goal is to help users pay utility bills.
You can see the structure of web pages and decide what actions to take.
Always respond with valid JSON matching the AIDecision interface.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent, deterministic responses
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const decision = JSON.parse(content) as AIDecision;
      
      // Validate decision structure
      if (!decision.action || !decision.observation || !decision.reasoning) {
        throw new Error('Invalid AI decision structure');
      }

      console.log('🤖 AI Decision:', {
        observation: decision.observation,
        action: decision.action.type,
        confidence: decision.confidence
      });

      return decision;
    } catch (error) {
      console.error('❌ AI Decision Error:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for AI based on current context
   */
  private buildPrompt(
    pageContext: PageContext,
    goal: AgentGoal,
    actionHistory: string[]
  ): string {
    return `
# Web Automation Task

## Current Goal
Type: ${goal.type}
Provider: ${goal.context.provider}
${goal.context.accountNumber ? `Account Number: ${goal.context.accountNumber}` : ''}
${goal.context.billAmount ? `Bill Amount: $${goal.context.billAmount}` : ''}

## Current Page State
URL: ${pageContext.url}
Title: ${pageContext.title}

### Interactive Elements
Buttons (clickable):
${JSON.stringify(pageContext.buttons, null, 2)}

Links:
${JSON.stringify(pageContext.links.slice(0, 10), null, 2)}

Input Fields:
${JSON.stringify(pageContext.inputs, null, 2)}

### Page Content
Headings: ${pageContext.headings.join(', ')}
Alerts/Messages: ${pageContext.alerts.join(', ')}

Visible Text (first 500 chars): ${pageContext.visibleText.substring(0, 500)}

## Current Page Analysis
You are currently on: ${this.analyzePage(pageContext.url, pageContext.title)}

${this.checkGoalAchieved(goal, pageContext, actionHistory)}

## ⚠️ IMPORTANT - Your Action History (Review before deciding next action!):
${actionHistory.length > 0 ? actionHistory.map((action, idx) => `${idx + 1}. ${action}`).join('\n') : 'No previous actions yet'}

${actionHistory.some(a => a.toLowerCase().includes('search')) ? '🚨 YOU ALREADY CLICKED SEARCH! Now you must TYPE into the search field, not click search again!' : ''}

## Instructions
Based on the current page and goal, determine the next action.

${this.getGoalSpecificInstructions(goal.type, goal, actionHistory)}

## Response Format
Respond with JSON:
{
  "observation": "Brief description of what you see on the current page",
  "reasoning": "Why you chose this action to move toward the goal",
  "action": {
    "type": "click" | "type" | "navigate" | "wait" | "scroll",
    "target": "exact button text, link text, or input label - must match available elements",
    "value": "value to type (only for 'type' action)"
  },
  "goalAchieved": boolean (true if goal is complete),
  "confidence": number 0-100
}

## Important Rules
1. Use EXACT text from the elements above - don't paraphrase
2. For "Guest Pay" or "Pay Bill" features, look for buttons/links containing those terms
3. If you see a cookie banner or popup, handle it first
4. If the page doesn't match the provider, suggest searching Google
5. Be conservative - if unsure, wait or gather more information
`;
  }

  private getGoalSpecificInstructions(goalType: string, goal: AgentGoal, actionHistory: string[]): string {
    switch (goalType) {
      case 'find_guest_pay_url':
        return `
Your task is to find the "Guest Pay" or "Pay Bill Without Login" option.

STEP-BY-STEP STRATEGY:
1. **Handle popups first**: If you see a cookie banner, consent popup, or modal → Click "Accept", "I Agree", "Close", or "X" button

2. **Look for direct links**: Scan for buttons/links containing:
   - "Pay Bill", "Guest Pay", "Pay as Guest", "Quick Pay", "Pay My Bill", "Bill Payment"
   - Usually in the main navigation menu or hero section
   
   **⚠️ IMPORTANT - Button Priority:**
   - Prefer UPPERCASE buttons like "PAY YOUR BILL" over mixed-case links
   - "Pay My Bill" in links list might be in a dropdown (not directly clickable)
   - "PAY YOUR BILL" button is always clickable
   - If you see both, choose the UPPERCASE one first!

3. **Use site search if no direct link found**:
   
   **IMPORTANT - CHECK YOUR ACTION HISTORY FIRST:**
   - If you already clicked "Search" button → DON'T click it again!
   - Instead, look for the search INPUT FIELD that appeared and TYPE into it
   
   **Search sequence:**
   a) FIRST TIME: Click search button/icon to open search overlay
      * Look for button with text "Search" or aria-label containing "search"
   
   b) AFTER clicking search: Look for INPUT fields with:
      * type="search" OR
      * placeholder containing "search" OR  
      * any visible text input that appeared after clicking search
      * Then TYPE "guest pay" as the value
   
   c) AFTER typing "guest pay": 
      * System will auto-press Enter and try to submit
      * Check if URL changed to search results page (URL contains "/search" or "?search=")
   
   d) AFTER search results appear: 
      * **CHECK PAGE CONTEXT**: Are you on a search results page? (title contains "Search" or URL has "/search")
      * **ANALYZE SEARCH RESULTS**: Look at the LINKS list for results containing:
        - "Pay My Bill", "Guest Pay", "Pay as Guest", "Quick Pay", "Bill Payment"
        - Links pointing to payment-related URLs
      * **PICK THE BEST RESULT**: 
        - Prioritize links with "Pay" + "Guest" or "Pay" + "Bill" 
        - First relevant result is usually best
      * **CLICK THE LINK**: Use the EXACT link text from the search results
      * **Example**: If you see link "Pay My Bill" → action: { type: "click", target: "Pay My Bill" }

4. **Never use Google**: We're avoiding Google to prevent CAPTCHA issues

5. **GOAL ACHIEVED - Recognize Success**:
   **CHECK IF YOU'RE ON THE GUEST PAY PAGE:**
   - URL contains "guest" OR "pay-bill" OR "quick-pay"
   - Page title contains "Guest" OR "Pay Bill" OR "Quick Pay"
   - Inputs visible for "Account Number" OR "Account #" OR "ZIP"
   
   **IF YES → SET goalAchieved: true**

CRITICAL RULES:
- Check action history - if you already did "click: Search", do NOT repeat it!
- After clicking search button, you MUST type into the search field that appears
- Use TYPE action with value "guest pay" - not another click action!
- When on search results page, STOP typing and START clicking the best result link!
- If you've typed "guest pay" more than once, you're stuck - click a search result instead!
- **IF YOU'RE ON THE GUEST PAY FORM → STOP and set goalAchieved: true!**
`;

      case 'navigate_to_guest_pay':
        return `
Your task is to navigate to the guest payment page.
- Click on "Guest Pay", "Pay Bill", or similar options
- Handle any cookie banners or popups first
- If redirected to login, look for "Pay as Guest" option
`;

      case 'fill_bill_info':
        const accountNumber = goal.context.accountNumber || '';
        const zipCode = goal.context.zipCode || goal.context.billAddress?.match(/\d{5}/)?.[0] || '';
        
        return `
Your task is to fill in the guest payment form with account information (DO NOT SUBMIT).

**🎯 YOUR MISSION:**
Fill these exact values into the form:
- Account Number: "${accountNumber}"
- ZIP Code: "${zipCode}"

**📋 ACTION HISTORY CHECK:**
Review your action history to see what you've already filled:
${actionHistory.map((action, idx) => `${idx + 1}. ${action}`).join('\n')}

**🔄 DECISION LOGIC:**

**IF** you haven't typed the account number yet:
→ Return: { "action": { "type": "type", "target": "Account Number", "value": "${accountNumber}" } }

**ELSE IF** you've filled account number BUT NOT zip code:
→ Return: { "action": { "type": "type", "target": "ZIP Code", "value": "${zipCode}" } }

**ELSE IF** you've filled BOTH fields:
→ Return: { "action": { "type": "wait", "target": "", "value": "" }, "goalAchieved": true }

**🎯 INPUT FIELD NAMES TO LOOK FOR:**
- Account Number: "Account Number", "Account #", "Acct Number", "Account", "Account ID"
- ZIP Code: "ZIP Code", "ZIP", "Zip Code", "Postal Code", "Zip"

**❌ DO NOT:**
- Click submit/continue buttons
- Fill credit card information
- Click any payment buttons
- Set goalAchieved: true until BOTH fields are filled

**✅ EXAMPLE CORRECT RESPONSE (if account number not filled yet):**
{
  "observation": "I see the guest pay form with Account Number and ZIP Code fields",
  "reasoning": "I need to fill the Account Number field first with the provided account number",
  "action": {
    "type": "type",
    "target": "Account Number",
    "value": "${accountNumber}"
  },
  "goalAchieved": false,
  "confidence": 95
}
`;

      case 'select_payment_method':
        return `
Your task is to select "Bank Account" as the payment method and submit the form to proceed.

**🎯 YOUR MISSION:**
1. Select "Bank Account" payment method (there should be radio buttons for "Bank Account" and "Credit Card")
2. Click the submit/continue button (look for: "Pay Bill", "Continue", "Next", "Submit", "Proceed")

**📋 ACTION HISTORY CHECK:**
Review your action history:
${actionHistory.map((action, idx) => `${idx + 1}. ${action}`).join('\n')}

**🔄 DECISION LOGIC:**

**IF** you haven't clicked "Bank Account" yet:
→ Return: { "action": { "type": "click", "target": "Bank Account", "value": "" } }

**ELSE IF** you've selected "Bank Account" BUT haven't clicked the submit button:
→ Look for buttons with text: "Pay Bill", "Continue", "Next", "Submit", "Proceed"
→ Return: { "action": { "type": "click", "target": "[exact button text]", "value": "" } }

**ELSE IF** you've clicked both Bank Account AND the submit button:
→ Return: { "action": { "type": "wait", "target": "", "value": "" }, "goalAchieved": true }

**🎯 BUTTON NAMES TO LOOK FOR:**
- Submit buttons: "Pay Bill", "Continue", "Next", "Submit", "Proceed", "Go to Payment"
- Payment method: "Bank Account", "Checking Account", "Savings Account"

**❌ DO NOT:**
- Fill in bank account numbers (we'll handle that later)
- Fill in routing numbers
- Click "Credit Card" option

**✅ EXAMPLE CORRECT RESPONSE (if Bank Account not selected yet):**
{
  "observation": "I see the payment form with radio buttons for Bank Account and Credit Card",
  "reasoning": "I need to select Bank Account first before proceeding",
  "action": {
    "type": "click",
    "target": "Bank Account",
    "value": ""
  },
  "goalAchieved": false,
  "confidence": 95
}
`;

      case 'fill_bank_account':
        const bankAccountNumber = goal.context.bankAccountNumber || '';
        const bankRoutingNumber = goal.context.bankRoutingNumber || '';
        
        return `
Your task is to fill in the bank account information on the payment form (DO NOT SUBMIT).

**🎯 YOUR MISSION:**
Fill these exact values into the form:
- Routing Number: "${bankRoutingNumber}"
- Account Number: "${bankAccountNumber}"

**📋 ACTION HISTORY CHECK:**
Review your action history to see what you've already filled:
${actionHistory.map((action, idx) => `${idx + 1}. ${action}`).join('\n')}

**🔄 DECISION LOGIC:**

**IF** you haven't typed the routing number yet:
→ Return: { "action": { "type": "type", "target": "Routing Number", "value": "${bankRoutingNumber}" } }

**ELSE IF** you've filled routing number BUT NOT account number:
→ Return: { "action": { "type": "type", "target": "Account Number", "value": "${bankAccountNumber}" } }

**ELSE IF** you've filled BOTH fields:
→ Return: { "action": { "type": "wait", "target": "", "value": "" }, "goalAchieved": true }

**🎯 INPUT FIELD NAMES TO LOOK FOR:**
- Routing Number: "Routing Number", "Routing #", "Bank Routing", "ABA Routing", "RTN"
- Account Number: "Account Number", "Account #", "Bank Account", "Checking Account"

**❌ DO NOT:**
- Click submit/continue buttons
- Fill other payment fields
- Set goalAchieved: true until BOTH fields are filled

**✅ EXAMPLE CORRECT RESPONSE (if routing number not filled yet):**
{
  "observation": "I see the bank account payment form with Routing Number and Account Number fields",
  "reasoning": "I need to fill the Routing Number field first with the provided routing number",
  "action": {
    "type": "type",
    "target": "Routing Number",
    "value": "${bankRoutingNumber}"
  },
  "goalAchieved": false,
  "confidence": 95
}
`;

      case 'make_payment':
        return `
Your task is to complete the payment.
- Review payment details
- Submit the payment
- Capture confirmation
`;

      default:
        return 'Determine the best next action to achieve the goal.';
    }
  }

  /**
   * Check if goal is achieved and provide explicit feedback
   */
  private checkGoalAchieved(goal: AgentGoal, pageContext: any, actionHistory: string[]): string {
    const url = pageContext.url.toLowerCase();
    const title = pageContext.title.toLowerCase();
    
    if (goal.type === 'find_guest_pay_url') {
      // Check if we're on ANY pay bill page (includes both guest-specific and general pay bill pages)
      const isPayBillPage = 
        url.includes('guest') || 
        url.includes('pay-bill') || 
        url.includes('quick-pay') ||
        url.includes('pay-my-bill') ||
        title.includes('guest') ||
        title.includes('pay your') ||
        title.includes('pay bill');
      
      // Check for BOTH account AND ZIP input fields (required for guest payment)
      const hasAccountField = pageContext.inputs.some((inp: any) => 
        inp.label?.toLowerCase().includes('account') || 
        inp.placeholder?.toLowerCase().includes('account') ||
        inp.id?.toLowerCase().includes('account')
      );
      
      const hasZipField = pageContext.inputs.some((inp: any) =>
        inp.label?.toLowerCase().includes('zip') ||
        inp.placeholder?.toLowerCase().includes('zip') ||
        inp.id?.toLowerCase().includes('zip') ||
        inp.label?.toLowerCase().includes('postal')
      );
      
      // GOAL ACHIEVED if we're on a pay bill page AND have both required fields
      if (isPayBillPage && hasAccountField && hasZipField) {
        return `
🎯🎯🎯 **GOAL ACHIEVED!** 🎯🎯🎯

**YOU ARE ON THE GUEST PAY PAGE!**
- Current URL: ${pageContext.url}
- Page Title: ${pageContext.title}
- ✅ Account Number field detected
- ✅ ZIP Code field detected

**⚠️ STOP ALL ACTIONS AND SET goalAchieved: true ⚠️**
DO NOT search, click, or type anything else!
`;
      }
    }
    
    if (goal.type === 'fill_bill_info') {
      // Check if form fields are filled
      const accountFilled = actionHistory.some(a => a.includes('type:') && a.includes('account'));
      const zipFilled = actionHistory.some(a => a.includes('type:') && a.includes('zip'));
      
      if (accountFilled && zipFilled) {
        return `
🎯🎯🎯 **GOAL ACHIEVED!** 🎯🎯🎯

**FORM FIELDS FILLED!**
- Account Number: ✅ Filled
- ZIP Code: ✅ Filled

**⚠️ STOP ALL ACTIONS AND SET goalAchieved: true ⚠️**
DO NOT click submit - user will handle CAPTCHA!
`;
      }
    }
    
    return '';
  }

  /**
   * Analyze what page we're currently on
   */
  private analyzePage(url: string, title: string): string {
    if (url.includes('google.com/search')) {
      return 'Google search results page';
    } else if (url.includes('google.com')) {
      return 'Google homepage';
    } else if (url.includes('/search') || url.includes('?search=') || title.toLowerCase().includes('search')) {
      return `🔍 SEARCH RESULTS PAGE - ${title} (${new URL(url).hostname})`;
    } else {
      return `${title} (${new URL(url).hostname})`;
    }
  }

  /**
   * Get the provider's homepage URL directly (avoid Google CAPTCHA)
   */
  async findProviderGuestPayUrl(provider: string): Promise<string> {
    console.log(`🔍 Determining homepage for ${provider}`);
    
    // Common utility provider homepage mappings
    const providerHomepages: { [key: string]: string } = {
      'con edison': 'https://www.coned.com',
      'conedison': 'https://www.coned.com',
      'coned': 'https://www.coned.com',
      'con ed': 'https://www.coned.com',
      'national grid': 'https://www.nationalgridus.com',
      'pse&g': 'https://www.pseg.com',
      'pseg': 'https://www.pseg.com',
      'duke energy': 'https://www.duke-energy.com',
      'pg&e': 'https://www.pge.com',
      'pacific gas and electric': 'https://www.pge.com',
      'southern california edison': 'https://www.sce.com',
      'sce': 'https://www.sce.com',
      'dominion energy': 'https://www.dominionenergy.com',
      'xcel energy': 'https://www.xcelenergy.com',
      'commonwealth edison': 'https://www.comed.com',
      'comed': 'https://www.comed.com',
      'atlanta gas light': 'https://www.atlantagaslight.com',
      'agl': 'https://www.atlantagaslight.com',
      'peoples gas': 'https://www.peoplesgasdelivery.com',
      'centerpoint energy': 'https://www.centerpointenergy.com',
      'entergy': 'https://www.entergy.com',
      'florida power & light': 'https://www.fpl.com',
      'fpl': 'https://www.fpl.com'
    };

    const normalizedProvider = provider.toLowerCase().trim();
    const homepage = providerHomepages[normalizedProvider];

    if (homepage) {
      console.log(`✅ Found homepage: ${homepage}`);
      return homepage;
    }

    // Fallback: construct likely homepage URL
    const sanitized = provider.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/energy|electric|gas|power|light|company|corporation|inc/g, '');
    
    const fallbackUrl = `https://www.${sanitized}.com`;
    console.log(`⚠️ Using fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  }
}

