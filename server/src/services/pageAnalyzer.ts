import { Page } from 'playwright';

export interface PageContext {
  url: string;
  title: string;
  buttons: Array<{ text: string; id?: string; class?: string; ariaLabel?: string }>;
  links: Array<{ text: string; href: string }>;
  inputs: Array<{ type: string; placeholder?: string; label?: string; id?: string }>;
  headings: string[];
  alerts: string[];
  visibleText: string;
}

export class PageAnalyzer {
  /**
   * Extract comprehensive page context for AI decision making
   */
  static async analyzePage(page: Page): Promise<PageContext> {
    try {
      // Wait for page to be stable
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('⏱️ Network idle timeout - continuing anyway');
      });

      // Additional wait for search results pages (dynamic content)
      const currentUrl = await page.url();
      if (currentUrl.includes('/search') || currentUrl.includes('?search=')) {
        console.log('🔍 Search page detected - waiting for results to load...');
        await page.waitForTimeout(2000); // Wait 2 seconds for search results
      }

      const [url, title, buttons, links, inputs, headings, alerts, visibleText] = await Promise.all([
        page.url(),
        page.title(),
        this.getButtons(page),
        this.getLinks(page),
        this.getInputs(page),
        this.getHeadings(page),
        this.getAlerts(page),
        this.getVisibleText(page)
      ]);

      // Increase limits for search results pages to capture payment links
      const isSearchPage = url.includes('/search') || url.includes('?search=') || title.toLowerCase().includes('search');
      const linkLimit = isSearchPage ? 30 : 15; // More links on search pages
      const buttonLimit = isSearchPage ? 30 : 20;

      return {
        url,
        title,
        buttons: buttons.slice(0, buttonLimit),
        links: links.slice(0, linkLimit), // Increased for search pages
        inputs: inputs.slice(0, 20), // Increased to capture guest pay inputs below login form
        headings: headings.slice(0, 10),
        alerts,
        visibleText: visibleText.substring(0, 1000) // Limit text length
      };
    } catch (error) {
      console.error('❌ Error analyzing page:', error);
      throw error;
    }
  }

  private static async getButtons(page: Page) {
    return await page.$$eval(
      'button, [role="button"], input[type="submit"], input[type="button"]',
      (elements) => elements.map(el => ({
        text: el.textContent?.trim() || '',
        id: (el as HTMLElement).id || undefined,
        class: (el as HTMLElement).className || undefined,
        ariaLabel: (el as HTMLElement).getAttribute('aria-label') || undefined
      })).filter(btn => btn.text || btn.ariaLabel)
    );
  }

  private static async getLinks(page: Page) {
    const links = await page.$$eval('a', (elements) =>
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href,
        visible: (el as HTMLElement).offsetParent !== null // Check if visible
      })).filter(link => link.text && link.href && link.visible)
    );
    
    console.log(`📊 Total links extracted: ${links.length}`);
    if (links.length > 0) {
      console.log(`📊 Sample links:`, links.slice(0, 10).map(l => l.text));
    }
    
    return links.map(({ text, href }) => ({ text, href }));
  }

  private static async getInputs(page: Page) {
    const inputs = await page.$$eval('input, textarea, select', (elements) => {
      return elements.map(el => {
        const input = el as HTMLInputElement;
        // Try to find associated label
        let label = '';
        if (input.id) {
          const labelEl = document.querySelector(`label[for="${input.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() || '';
        }
        if (!label && input.labels && input.labels.length > 0) {
          label = input.labels[0].textContent?.trim() || '';
        }

        return {
          type: input.type || 'text',
          placeholder: input.placeholder || undefined,
          label: label || undefined,
          id: input.id || undefined,
          visible: (el as HTMLElement).offsetParent !== null // Check if visible
        };
      }).filter(inp => (inp.label || inp.placeholder || inp.id) && inp.visible);
    });
    
    console.log(`📊 Total inputs extracted: ${inputs.length}`);
    if (inputs.length > 0) {
      console.log(`📊 Sample inputs:`, inputs.slice(0, 10).map(inp => inp.label || inp.placeholder || inp.id));
    }
    
    return inputs.map(({ type, placeholder, label, id }) => ({ type, placeholder, label, id }));
  }

  private static async getHeadings(page: Page) {
    return await page.$$eval('h1, h2, h3', (elements) =>
      elements.map(el => el.textContent?.trim() || '').filter(h => h)
    );
  }

  private static async getAlerts(page: Page) {
    return await page.$$eval(
      '[role="alert"], .alert, .error, .warning, .success, .message',
      (elements) => elements.map(el => el.textContent?.trim() || '').filter(a => a)
    );
  }

  private static async getVisibleText(page: Page) {
    return await page.evaluate(() => {
      // Get only visible text from body
      const body = document.body;
      if (!body) return '';
      
      const walker = document.createTreeWalker(
        body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Skip script, style, and hidden elements
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
            
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      let text = '';
      let node;
      while (node = walker.nextNode()) {
        const nodeText = node.textContent?.trim();
        if (nodeText) text += nodeText + ' ';
      }
      
      return text.trim();
    });
  }
}

