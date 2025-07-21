export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: any;
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

export interface ParsedEmail {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  preview: string;
  body: string;
  date: Date;
  read: boolean;
  starred: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

class GmailApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private clientId: string;
  private redirectUri: string;
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 100; // 100ms between requests

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    this.redirectUri = `${window.location.origin}/auth`;
    
    // Load stored tokens on initialization
    this.loadStoredTokens();
  }

  private loadStoredTokens(): void {
    this.accessToken = localStorage.getItem('gmail_access_token');
    this.refreshToken = localStorage.getItem('gmail_refresh_token');
  }

  // Rate-limited fetch method
  private async rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    
    const response = await fetch(url, options);
    
    // If we hit rate limit, wait and retry once
    if (response.status === 429) {
      console.log('Rate limit hit, waiting 2 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.lastRequestTime = Date.now();
      return await fetch(url, options);
    }
    
    return response;
  }

  // Sign in with Google using OAuth 2.0 Implicit Flow
  async signInWithGoogle(): Promise<void> {
    if (!this.clientId) {
      throw new Error('Google Client ID is not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&prompt=consent`;

    // Store the current URL to return to after auth
    sessionStorage.setItem('auth_redirect', window.location.href);
    
    // Redirect to Google OAuth
    window.location.href = authUrl;
  }

  // Handle OAuth callback for implicit flow
  async handleAuthCallback(): Promise<boolean> {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return false;
    }

    if (accessToken) {
      this.accessToken = accessToken;
      localStorage.setItem('gmail_access_token', accessToken);
      
      // Clear the hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Redirect back to the original page or home
      const redirectUrl = sessionStorage.getItem('auth_redirect') || '/';
      sessionStorage.removeItem('auth_redirect');
      window.location.href = redirectUrl;
      
      return true;
    }

    return false;
  }

  // Refresh access token using refresh token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      if (this.accessToken) {
        localStorage.setItem('gmail_access_token', this.accessToken);
      }
      
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  // Check if user is already authenticated
  async checkAuthStatus(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    // Try to use current access token
    try {
      await this.getUserProfile();
      return true;
    } catch {
      // Token might be expired, try to refresh
      if (this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          try {
            await this.getUserProfile();
            return true;
          } catch {
            console.error('Error after token refresh');
          }
        }
      }
      
      // If refresh failed, clear tokens and return false
      this.logout();
      return false;
    }
  }

  // Get user profile from Google People API
  async getUserProfile(): Promise<UserProfile> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      console.log('Fetching user profile with token:', this.accessToken.substring(0, 20) + '...');
      
      const response = await this.rateLimitedFetch(
        'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('People API response status:', response.status);
      console.log('People API response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('People API error response:', errorText);
        
        // Fallback to Gmail API if People API fails
        console.log('Falling back to Gmail API for user profile...');
        return await this.getUserProfileFromGmail();
      }

      const data = await response.json();
      console.log('People API response data:', data);
      
      return {
        name: data.names?.[0]?.displayName || 'Unknown User',
        email: data.emailAddresses?.[0]?.value || '',
        avatar: data.photos?.[0]?.url || ''
      };
    } catch (error) {
      console.error('Error fetching user profile from People API:', error);
      
      // Fallback to Gmail API if People API fails
      console.log('Falling back to Gmail API for user profile...');
      return await this.getUserProfileFromGmail();
    }
  }

  // Fallback method to get user profile from Gmail API
  private async getUserProfileFromGmail(): Promise<UserProfile> {
    try {
      const response = await this.rateLimitedFetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Gmail API profile data:', data);
      
      return {
        name: data.emailAddress || 'Gmail User',
        email: data.emailAddress || '',
        avatar: '' // Gmail API doesn't provide avatar
      };
    } catch (error) {
      console.error('Error fetching user profile from Gmail API:', error);
      throw new Error('Failed to fetch user profile from both People API and Gmail API');
    }
  }

  // Get Gmail messages with rate limiting
  async getMessages(maxResults: number = 50): Promise<ParsedEmail[]> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      // Get list of message IDs
      const listResponse = await this.rateLimitedFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Gmail API error: ${listResponse.status}`);
      }

      const listData = await listResponse.json();

      if (!listData.messages) {
        return [];
      }

      // Process messages in smaller batches to avoid rate limiting
      const batchSize = 10;
      const messages: ParsedEmail[] = [];
      
      for (let i = 0; i < listData.messages.length; i += batchSize) {
        const batch = listData.messages.slice(i, i + batchSize);
        
        // Process batch sequentially to respect rate limits
        for (const message of batch) {
          try {
            const messageResponse = await this.rateLimitedFetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (messageResponse.ok) {
              const messageData = await messageResponse.json();
              const parsedMessage = this.parseMessage(messageData);
              if (parsedMessage) {
                messages.push(parsedMessage);
              }
            } else {
              console.error(`Failed to fetch message ${message.id}: ${messageResponse.status}`);
            }
          } catch (error) {
            console.error(`Error fetching message ${message.id}:`, error);
          }
        }
        
        // Add a small delay between batches
        if (i + batchSize < listData.messages.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  private parseMessage(message: any): ParsedEmail | null {
    if (!message.payload || !message.id) {
      return null;
    }

    const headers = message.payload.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('from');
    const subject = getHeader('subject');
    const date = getHeader('date');
    
    // Parse from field
    let fromName = '';
    let fromEmail = '';
    if (from) {
      const match = from.match(/(.*?)\s*<(.+?)>/);
      if (match) {
        fromName = match[1].trim();
        fromEmail = match[2].trim();
      } else {
        fromEmail = from.trim();
        fromName = fromEmail.split('@')[0];
      }
    }

    return {
      id: message.id,
      from: {
        name: fromName,
        email: fromEmail
      },
      subject: subject || '(No Subject)',
      preview: message.snippet || '',
      body: this.extractMessageBody(message.payload),
      date: new Date(date || message.internalDate),
      read: !message.labelIds?.includes('UNREAD'),
      starred: message.labelIds?.includes('STARRED') || false
    };
  }

  private extractMessageBody(payload: any): string {
    if (payload.body?.data) {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          // Strip HTML tags for plain text
          return html.replace(/<[^>]*>/g, '');
        }
      }
    }

    return '';
  }

  // Logout
  async logout(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_refresh_token');
    
    // No specific logout for Google Accounts ID library here,
    // as the new OAuth flow doesn't use it directly.
  }
}

export const gmailApiService = new GmailApiService();

// Add Google API types to window
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}