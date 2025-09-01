import { chromium, type Browser, type Page } from 'playwright';

export class PlaywrightAgent {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize the browser and create a new page
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({ 
        headless: false, // Set to true for production
        slowMo: 1000 // Slow down actions for visibility during development
      });
      this.page = await this.browser.newPage();
      
      // Set viewport and user agent
      await this.page.setViewportSize({ width: 1280, height: 720 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      console.log('✅ Playwright browser initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Playwright browser:', error);
      throw error;
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.log('✅ Playwright browser cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Tool 1: Open a URL - Enhanced with navigation detection
   */
  async openUrl(url: string): Promise<string> {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      console.log(`🌐 Opening URL: ${url}`);
      
      // Store initial state
      const initialUrl = this.page.url();
      const initialTitle = await this.page.title();
      
      // Navigate to the URL
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const finalUrl = this.page.url();
      const finalTitle = await this.page.title();
      
      console.log(`✅ Successfully opened: ${finalUrl}`);
      
      // Detect if navigation occurred
      const urlChanged = finalUrl !== initialUrl;
      const titleChanged = finalTitle !== initialTitle;
      
      let navigationType = 'none';
      if (urlChanged && titleChanged) {
        navigationType = 'full_navigation';
      } else if (urlChanged) {
        navigationType = 'url_change';
      } else if (titleChanged) {
        navigationType = 'title_change';
      }
      
      return JSON.stringify({ 
        ok: true, 
        url: finalUrl,
        title: finalTitle,
        navigationType,
        urlChanged,
        titleChanged,
        initialUrl,
        initialTitle
      });
    } catch (error) {
      console.error(`❌ Failed to open URL ${url}:`, error);
      return JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        url: url
      });
    }
  }

  /**
   * Tool 2: Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      const url = this.page.url();
      const title = await this.page.title();
      
      console.log(`📍 Current URL: ${url}`);
      
      return JSON.stringify({ 
        ok: true, 
        url: url,
        title: title
      });
    } catch (error) {
      console.error('❌ Failed to get current URL:', error);
      return JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Tool 3: Get DOM text - Enhanced for Phase 2
   */
  async getDomText(): Promise<string> {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      // Enhanced implementation with better filtering
      const elements = await this.page.$$eval(`
        a[href]:not([href=""]):not([href="#"]), 
        button:not([disabled]), 
        [role="button"]:not([disabled]),
        [role="link"],
        [role="menuitem"],
        [onclick],
        [tabindex]:not([tabindex="-1"])
      `, elements => {
        return elements
          .filter(el => {
            // Check if element is visible
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return false;
            }
            
            // Check if element has meaningful text content
            const text = el.textContent?.trim() || '';
            if (text.length === 0 || text.length > 100) {
              return false;
            }
            
            // Filter out CSS and script content
            if (text.includes('{') || text.includes('}') || text.includes('function') || text.includes('var ')) {
              return false;
            }
            
            // Filter out very short or very long text
            if (text.length < 2 || text.length > 50) {
              return false;
            }
            
            return true;
          })
          .map(el => {
            const text = el.textContent?.trim() || '';
            const tagName = el.tagName.toLowerCase();
            const href = el.getAttribute('href') || '';
            const role = el.getAttribute('role') || '';
            const className = el.className || '';
            
            // Get element position for debugging
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            
            return {
              text,
              tagName,
              href,
              role,
              className: className.substring(0, 50), // Limit class name length
              isVisible,
              position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            };
          })
          .sort((a, b) => {
            // Sort by position (top to bottom, left to right)
            if (Math.abs(a.position.y - b.position.y) < 10) {
              return a.position.x - b.position.x;
            }
            return a.position.y - b.position.y;
          });
      });

      console.log(`🔍 Found ${elements.length} visible clickable elements`);
      
      // Log some examples for debugging
      if (elements.length > 0) {
        console.log('📋 Sample elements:');
        elements.slice(0, 5).forEach((el, i) => {
          console.log(`  ${i + 1}. "${el.text}" (${el.tagName}) - ${el.href || 'no href'}`);
        });
      }
      
      return JSON.stringify({ 
        ok: true, 
        links: elements.map(item => item.text),
        elements: elements,
        count: elements.length
      });
    } catch (error) {
      console.error('❌ Failed to get DOM text:', error);
      return JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

    /**
   * Tool 4: Click text like - Enhanced for Phase 3 with Priority Logic
   */
  async clickTextLike(target: string, synonyms: string[]): Promise<string> {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      console.log(`🖱️ Attempting to click text like: "${target}" with synonyms: [${synonyms.join(', ')}]`);
      
      // Get all clickable elements with enhanced scoring
      const elements = await this.page.$$eval('a, button, [role="button"], [role="link"]', (elements, args) => {
        const { targetText, synonymList } = args;
        return elements
          .filter(el => {
            // Check if element is visible and clickable
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const text = el.textContent?.trim() || '';
            
            return text.length > 0 && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden' &&
                   rect.width > 0 && 
                   rect.height > 0;
          })
          .map(el => {
            const text = el.textContent?.trim() || '';
            const textLower = text.toLowerCase();
            const targetLower = targetText.toLowerCase();
            const tagName = el.tagName.toLowerCase();
            const href = el.getAttribute('href') || '';
            const rect = el.getBoundingClientRect();
            
            // Enhanced scoring with priority logic
            let score = 0;
            
            // Priority 1: Exact matches (highest priority)
            if (textLower === targetLower) {
              score = 100;
            }
            // Priority 2: Target contains the text (e.g., "Pay Bill" contains "Pay")
            else if (targetLower.includes(textLower) && textLower.length >= 3) {
              score = 85;
            }
            // Priority 3: Text contains the target (e.g., "My Account" contains "Account")
            else if (textLower.includes(targetLower)) {
              score = 80;
            }
            // Priority 4: Synonym matching
            else {
              for (const synonym of synonymList) {
                const synonymLower = synonym.toLowerCase();
                if (textLower === synonymLower) {
                  score = 90;
                  break;
                } else if (textLower.includes(synonymLower) || synonymLower.includes(textLower)) {
                  score = Math.max(score, 70);
                }
              }
            }
            
            // Bonus for specific priority targets
            if (targetLower.includes('my account') || targetLower.includes('account')) {
              if (textLower.includes('my account') || textLower.includes('account')) {
                score += 10; // Bonus for account-related elements
              }
            }
            
            if (targetLower.includes('pay') || targetLower.includes('bill')) {
              if (textLower.includes('pay') || textLower.includes('bill')) {
                score += 5; // Bonus for payment-related elements
              }
            }
            
            // Bonus for links over buttons (more likely to navigate)
            if (tagName === 'a' && href) {
              score += 5;
            }
            
            return {
              text,
              score,
              tagName,
              href,
              element: el,
              rect: rect
            };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => {
            // Sort by score (highest first), then by position (top to bottom)
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            return a.rect.y - b.rect.y;
                     });
      }, { targetText: target, synonymList: synonyms });

      if (elements.length === 0) {
        console.log('❌ No matching elements found');
        return JSON.stringify({ 
          ok: false, 
          error: 'No matching elements found',
          target: target,
          synonyms: synonyms
        });
      }

      // Log all potential matches for debugging
      console.log(`🔍 Found ${elements.length} potential matches:`);
      elements.slice(0, 5).forEach((el, i) => {
        console.log(`  ${i + 1}. "${el.text}" (score: ${el.score}, type: ${el.tagName}, href: ${el.href})`);
      });

      // Click the best match
      const bestMatch = elements[0];
      console.log(`🎯 Clicking best match: "${bestMatch.text}" (score: ${bestMatch.score})`);
      
      // Use Playwright's built-in click by text method
      await this.page.click(`text="${bestMatch.text}"`, { timeout: 5000 });
      
      console.log(`✅ Successfully clicked: "${bestMatch.text}"`);
      
      return JSON.stringify({ 
        ok: true, 
        clicked: true, 
        matched: bestMatch.text,
        score: bestMatch.score,
        href: bestMatch.href,
        tagName: bestMatch.tagName,
        method: 'enhanced_scoring'
      });
    } catch (error) {
      console.error('❌ Failed to click text:', error);
      return JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        target: target,
        synonyms: synonyms
      });
    }
  }

  /**
   * Tool 5: Wait for navigation - Enhanced with multiple detection methods
   */
  async waitForNavigation(): Promise<string> {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      console.log('⏳ Waiting for navigation...');
      
      // Store initial state for comparison
      const initialUrl = this.page.url();
      const initialTitle = await this.page.title();
      
      console.log(`📍 Initial URL: ${initialUrl}`);
      console.log(`📄 Initial Title: ${initialTitle}`);
      
      // Wait for multiple navigation indicators
      const navigationPromises = [
        // Wait for network to be idle (no requests for 500ms)
        this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => 'timeout'),
        
        // Wait for DOM to be ready
        this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => 'timeout'),
        
        // Wait for any URL change
        this.page.waitForURL(url => url !== initialUrl, { timeout: 10000 }).catch(() => 'no_url_change'),
        
        // Wait for title change
        this.page.waitForFunction(
          (initialTitle) => document.title !== initialTitle,
          initialTitle,
          { timeout: 10000 }
        ).catch(() => 'no_title_change')
      ];
      
      // Wait for the first navigation indicator to complete
      const results = await Promise.allSettled(navigationPromises);
      
      // Get final state
      const finalUrl = this.page.url();
      const finalTitle = await this.page.title();
      
      console.log(`📍 Final URL: ${finalUrl}`);
      console.log(`📄 Final Title: ${finalTitle}`);
      
      // Analyze navigation results
      const urlChanged = finalUrl !== initialUrl;
      const titleChanged = finalTitle !== initialTitle;
      
      // Determine navigation type
      let navigationType = 'none';
      let navigationMethod = 'unknown';
      
      if (urlChanged && titleChanged) {
        navigationType = 'full_navigation';
        navigationMethod = 'url_and_title_change';
      } else if (urlChanged) {
        navigationType = 'url_change';
        navigationMethod = 'url_change_only';
      } else if (titleChanged) {
        navigationType = 'title_change';
        navigationMethod = 'title_change_only';
      } else {
        // Check if any navigation promises resolved successfully
        const successfulResults = results.filter(result => 
          result.status === 'fulfilled' && result.value !== 'timeout' && result.value !== 'no_url_change' && result.value !== 'no_title_change'
        );
        
        if (successfulResults.length > 0) {
          navigationType = 'same_page_update';
          navigationMethod = 'content_update';
        }
      }
      
      // Additional checks for SPA navigation
      if (!urlChanged && !titleChanged) {
        // Check if page content changed (for SPAs)
        const contentChanged = await this.page.evaluate(() => {
          // Check if any major content areas changed
          const mainContent = document.querySelector('main, [role="main"], .main, #main');
          if (mainContent) {
            return mainContent.innerHTML.length > 100; // Basic content check
          }
          return document.body.innerHTML.length > 500; // Fallback
        });
        
        if (contentChanged) {
          navigationType = 'spa_navigation';
          navigationMethod = 'content_change';
        }
      }
      
      console.log(`✅ Navigation detected: ${navigationType} (${navigationMethod})`);
      
      return JSON.stringify({ 
        ok: true, 
        navigated: true,
        navigationType,
        navigationMethod,
        initialUrl,
        finalUrl,
        initialTitle,
        finalTitle,
        urlChanged,
        titleChanged,
        timeout: 15000
      });
    } catch (error) {
      console.error('❌ Navigation wait failed:', error);
      return JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timeout: 15000
      });
    }
  }
}

// Export singleton instance
export const playwrightAgent = new PlaywrightAgent();
