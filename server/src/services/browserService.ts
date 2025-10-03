import puppeteer, { Browser, Page } from 'puppeteer';

export class BrowserService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing browser...');
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 720 });
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async navigateTo(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      console.log('✅ Navigation successful');
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      throw error;
    }
  }

  async takeScreenshot(filename?: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const screenshotPath = filename || `screenshot-${Date.now()}.png`;
      await this.page.screenshot({ 
        path: `./screenshots/${screenshotPath}`,
        fullPage: true 
      });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error('❌ Screenshot failed:', error);
      throw error;
    }
  }

  async getPageTitle(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return this.page.url();
  }

  async findElement(selector: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async clickElement(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      console.log(`🖱️ Clicking element: ${selector}`);
      await this.page.click(selector);
      console.log('✅ Click successful');
    } catch (error) {
      console.error('❌ Click failed:', error);
      throw error;
    }
  }

  async typeText(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      console.log(`⌨️ Typing text in: ${selector}`);
      await this.page.type(selector, text);
      console.log('✅ Text input successful');
    } catch (error) {
      console.error('❌ Text input failed:', error);
      throw error;
    }
  }

  async waitForNavigation(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      console.log('✅ Navigation completed');
    } catch (error) {
      console.error('❌ Navigation wait failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('🧹 Browser cleaned up');
      }
    } catch (error) {
      console.error('❌ Browser cleanup failed:', error);
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }
}

