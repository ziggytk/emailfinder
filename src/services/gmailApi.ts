import { supabase } from './supabaseClient';

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
  hasAttachments: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

class GmailApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_DELAY = 100; // 100ms between requests

  constructor() {
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

  // Sign in with Google using Supabase OAuth
  async signInWithGoogle(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically
      console.log('OAuth sign-in initiated:', data);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  // Handle OAuth callback from Supabase
  async handleAuthCallback(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return false;
      }

      if (session?.access_token) {
        console.log('🔍 Supabase session details:', {
          hasAccessToken: !!session.access_token,
          hasProviderToken: !!session.provider_token,
          hasRefreshToken: !!session.refresh_token,
          providerToken: session.provider_token ? session.provider_token.substring(0, 20) + '...' : 'none',
          user: session.user ? {
            id: session.user.id,
            email: session.user.email,
            hasUserMetadata: !!session.user.user_metadata,
            metadataKeys: session.user.user_metadata ? Object.keys(session.user.user_metadata) : []
          } : 'no user'
        });
        
        // Get the Google provider token from the session
        const googleAccessToken = session.provider_token;
        
        // Also check user metadata for Google access token
        const userMetadata = session.user?.user_metadata;
        const metadataAccessToken = userMetadata?.access_token || userMetadata?.google_access_token;
        
        if (googleAccessToken) {
          console.log('✅ Found Google access token from Supabase session provider_token');
          this.accessToken = googleAccessToken;
          localStorage.setItem('gmail_access_token', googleAccessToken);
        } else if (metadataAccessToken) {
          console.log('✅ Found Google access token from user metadata');
          this.accessToken = metadataAccessToken;
          localStorage.setItem('gmail_access_token', metadataAccessToken);
        } else {
          console.log('⚠️ No Google access token found, using Supabase access token (this may not work for Google APIs)');
          this.accessToken = session.access_token;
          localStorage.setItem('gmail_access_token', session.access_token);
        }
        
        if (session.refresh_token) {
          this.refreshToken = session.refresh_token;
          localStorage.setItem('gmail_refresh_token', session.refresh_token);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error handling auth callback:', error);
      return false;
    }
  }

  // Refresh access token using Supabase
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }

      if (session?.access_token) {
        // Get the Google provider token from the session
        const googleAccessToken = session.provider_token;
        
        if (googleAccessToken) {
          console.log('✅ Found Google access token from refreshed Supabase session');
          this.accessToken = googleAccessToken;
          localStorage.setItem('gmail_access_token', googleAccessToken);
        } else {
          console.log('⚠️ No Google provider token found in refreshed session, using Supabase access token');
          this.accessToken = session.access_token;
          localStorage.setItem('gmail_access_token', session.access_token);
        }
        
        if (session.refresh_token) {
          this.refreshToken = session.refresh_token;
          localStorage.setItem('gmail_refresh_token', session.refresh_token);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking auth status:', error);
        return false;
      }

      if (session?.access_token) {
        // Get the Google provider token from the session
        const googleAccessToken = session.provider_token;
        
        if (googleAccessToken) {
          console.log('✅ Found Google access token from Supabase session');
          this.accessToken = googleAccessToken;
          localStorage.setItem('gmail_access_token', googleAccessToken);
        } else {
          console.log('⚠️ No Google provider token found, using Supabase access token');
          this.accessToken = session.access_token;
          localStorage.setItem('gmail_access_token', session.access_token);
        }
        
        if (session.refresh_token) {
          this.refreshToken = session.refresh_token;
          localStorage.setItem('gmail_refresh_token', session.refresh_token);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
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
        
        // Try Supabase fallback first, then Gmail API
        console.log('Trying Supabase fallback for user profile...');
        try {
          return await this.getUserProfileFromSupabase();
        } catch (supabaseError) {
          console.log('Supabase fallback failed, trying Gmail API...');
          return await this.getUserProfileFromGmail();
        }
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
      
      // Try Supabase fallback first, then Gmail API
      console.log('Trying Supabase fallback for user profile...');
      try {
        return await this.getUserProfileFromSupabase();
      } catch (supabaseError) {
        console.log('Supabase fallback failed, trying Gmail API...');
        return await this.getUserProfileFromGmail();
      }
    }
  }

  // Get user profile from Supabase user metadata (fallback)
  async getUserProfileFromSupabase(): Promise<UserProfile> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        throw new Error('No Supabase session available');
      }

      const user = session.user;
      const metadata = user.user_metadata;
      
      console.log('Getting user profile from Supabase metadata:', metadata);
      
      return {
        name: metadata?.full_name || metadata?.name || user.email?.split('@')[0] || 'Unknown User',
        email: user.email || '',
        avatar: metadata?.avatar_url || metadata?.picture || ''
      };
    } catch (error) {
      console.error('Error getting user profile from Supabase:', error);
      throw error;
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

  // Search Gmail messages with a specific query
  async searchMessages(query: string, maxResults: number = 50): Promise<ParsedEmail[]> {
    console.log('🔍 searchMessages called with query:', query);
    
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`;
      console.log('🔍 Making request to:', url);
      
      // Get list of message IDs with search query
      const listResponse = await this.rateLimitedFetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', listResponse.status);
      
      if (!listResponse.ok) {
        console.error('❌ Gmail API error:', listResponse.status);
        throw new Error(`Gmail API error: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      console.log('📊 List data:', listData);

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
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // Get a single Gmail message by ID with attachments
  async getMessage(messageId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await this.rateLimitedFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
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

      const messageData = await response.json();
      
      // Extract attachments from the message payload
      const attachments = this.extractAttachments(messageData.payload);
      
      // Return message with attachments in the expected format
      return {
        ...messageData,
        attachments: attachments
      };
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  }

  // Extract attachments from Gmail message payload
  private extractAttachments(payload: any): any[] {
    const attachments: any[] = [];
    
    const processPart = (part: any) => {
      if (part.filename && part.filename.length > 0) {
        // This is an attachment
        attachments.push({
          id: part.body?.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size,
          data: part.body?.data // Base64 encoded data (may be null for large attachments)
        });
      }
      
      // Recursively process nested parts
      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };
    
    if (payload) {
      processPart(payload);
    }
    
    return attachments;
  }

  // Fetch attachment data for a specific attachment
  async getAttachmentData(messageId: string, attachmentId: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await this.rateLimitedFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
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

      const attachmentData = await response.json();
      return attachmentData.data; // Base64 encoded data
    } catch (error) {
      console.error('Error fetching attachment data:', error);
      throw error;
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

    // Check for attachments
    const hasAttachments = this.hasAttachments(message.payload);

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
      starred: message.labelIds?.includes('STARRED') || false,
      hasAttachments: hasAttachments
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

  private hasAttachments(payload: any): boolean {
    // Check if the message has parts (multipart)
    if (payload.parts) {
      for (const part of payload.parts) {
        // Check if this part is an attachment
        if (part.filename && part.filename.length > 0) {
          return true;
        }
        // Recursively check nested parts
        if (part.parts && this.hasAttachments(part)) {
          return true;
        }
      }
    }
    
    // Check if the message itself has a filename (single attachment)
    if (payload.filename && payload.filename.length > 0) {
      return true;
    }
    
    return false;
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out from Supabase:', error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear local tokens
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('gmail_access_token');
      localStorage.removeItem('gmail_refresh_token');
    }
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