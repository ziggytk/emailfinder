import { Page } from 'playwright';
import { AgentAction } from './aiDecisionService';

export class ActionExecutor {
  /**
   * Execute an action on the page based on AI decision
   */
  static async executeAction(page: Page, action: AgentAction): Promise<void> {
    try {
      console.log(`🎬 Executing action: ${action.type}`, action.target || '');

      switch (action.type) {
        case 'click':
          await this.executeClick(page, action.target!);
          break;

        case 'type':
          await this.executeType(page, action.target!, action.value!);
          break;

        case 'navigate':
          await this.executeNavigate(page, action.target!);
          break;

        case 'wait':
          await this.executeWait(page);
          break;

        case 'scroll':
          await this.executeScroll(page);
          break;

        default:
          console.warn(`⚠️ Unknown action type: ${action.type}`);
      }

      // Wait for page to stabilize after action
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {
        console.log('⏱️ DOM load timeout - continuing anyway');
      });

      // Small delay to let animations/transitions complete
      await page.waitForTimeout(1000);

      console.log(`✅ Action completed: ${action.type}`);
    } catch (error) {
      console.error(`❌ Action execution failed:`, error);
      throw error;
    }
  }

  private static async executeClick(page: Page, target: string): Promise<void> {
    // Try multiple strategies to find and click the element
    const strategies = [
      // Strategy 1: Exact text match
      () => page.getByText(target, { exact: true }).first(),
      
      // Strategy 2: Partial text match
      () => page.getByText(target).first(),
      
      // Strategy 3: By role and name
      () => page.getByRole('button', { name: target }).first(),
      () => page.getByRole('link', { name: target }).first(),
      
      // Strategy 4: By aria-label
      () => page.getByLabel(target).first(),
      
      // Strategy 5: By placeholder
      () => page.getByPlaceholder(target).first(),
      
      // Strategy 6: CSS selector if target looks like one
      () => target.match(/^[#.][\w-]+$/) ? page.locator(target).first() : null
    ];

    for (const strategy of strategies) {
      try {
        const element = await strategy();
        if (element) {
          await element.click({ timeout: 5000 });
          console.log(`✅ Clicked element using strategy`);
          return;
        }
      } catch (error) {
        // Try next strategy
        continue;
      }
    }

    // If all strategies fail, try a more aggressive search
    try {
      await page.click(`text="${target}"`, { timeout: 5000 });
      return;
    } catch (error) {
      throw new Error(`Could not find clickable element with text: "${target}"`);
    }
  }

  private static async executeType(page: Page, target: string, value: string): Promise<void> {
    const isSearchField = target.toLowerCase().includes('search') || 
                          target.toLowerCase().includes('find') ||
                          value.toLowerCase().includes('guest pay');

    // Try to find input field by various methods
    const strategies = [
      // Strategy 1: Exact label match
      () => page.getByLabel(target, { exact: true }).first(),
      
      // Strategy 2: Partial label match
      () => page.getByLabel(new RegExp(target, 'i')).first(),
      
      // Strategy 3: Placeholder match
      () => page.getByPlaceholder(new RegExp(target, 'i')).first(),
      
      // Strategy 4: ID or name attribute
      () => page.locator(`#${target}`).first(),
      () => page.locator(`input[name="${target}"]`).first(),
      () => page.locator(`textarea[name="${target}"]`).first(),
      
      // Strategy 5: For search fields, try common search selectors
      ...(isSearchField ? [
        () => page.locator('input[type="search"]').first(),
        () => page.locator('input[placeholder*="search" i]').first(),
        () => page.locator('input[placeholder*="find" i]').first(),
        () => page.locator('input[aria-label*="search" i]').first(),
        () => page.locator('input[class*="search" i]').first(),
        () => page.locator('input[id*="search" i]').first(),
        // Fallback: any visible text input
        () => page.locator('input[type="text"]:visible').first(),
        () => page.locator('input:not([type]):visible').first()
      ] : [])
    ];

    for (const strategy of strategies) {
      try {
        const element = await strategy();
        if (element && await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          await element.clear();
          await element.fill(value);
          
          if (isSearchField) {
            console.log(`✅ Typed "${value}" into search field`);
            
            // Try multiple methods to submit the search
            try {
              // Method 1: Press Enter
              console.log('Attempting to press Enter...');
              await element.press('Enter');
              await page.waitForTimeout(2000);
              
              // Check if URL changed or results appeared
              const urlAfterEnter = page.url();
              console.log(`URL after Enter: ${urlAfterEnter}`);
              
              // Method 2: If Enter didn't work, look for search button
              const searchButton = await page.locator('button[type="submit"], button[aria-label*="search" i], button:has-text("Search")').first();
              if (await searchButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                console.log('Found search submit button, clicking it...');
                await searchButton.click();
                await page.waitForTimeout(2000);
              }
            } catch (error) {
              console.log('Search submission methods completed');
            }
          } else {
            console.log(`✅ Typed "${value}" into field: ${target}`);
          }
          return;
        }
      } catch (error) {
        // Try next strategy
        continue;
      }
    }

    throw new Error(`Could not find input field: "${target}"`);
  }

  private static async executeNavigate(page: Page, url: string): Promise<void> {
    console.log(`🌐 Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
  }

  private static async executeWait(page: Page): Promise<void> {
    console.log('⏳ Waiting 2 seconds...');
    await page.waitForTimeout(2000);
  }

  private static async executeScroll(page: Page): Promise<void> {
    console.log('📜 Scrolling down...');
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.7);
    });
    await page.waitForTimeout(500);
  }

  /**
   * Take a screenshot of the current page
   */
  static async takeScreenshot(
    page: Page,
    filepath: string,
    fullPage: boolean = false
  ): Promise<void> {
    try {
      await page.screenshot({
        path: filepath,
        fullPage,
        type: 'png'
      });
      console.log(`📸 Screenshot saved: ${filepath}`);
    } catch (error) {
      console.error('❌ Screenshot failed:', error);
      throw error;
    }
  }
}

