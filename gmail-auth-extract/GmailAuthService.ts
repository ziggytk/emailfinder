import { createClient } from '@supabase/supabase-js';

// Types
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailPayload;
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

export interface GmailPayload {
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayload[];
  mimeType?: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailBody {
  data?: string;
  attachmentId?: string;
  size?: number;
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

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

// Supabase client - you'll need to configure this in your new project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class GmailAuthService {
  private accessToken: string | null = null;
  private gmailApiKey: string;

  constructor() {
    this.gmailApiKey = import.meta.env.VITE_GMAIL_API_KEY || '';
  }

  async signInWithGoogle(): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('OAuth initiation error:', error);
        throw new Error(`OAuth error: ${error.message}`);
      }

      console.log('OAuth initiated successfully');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async handleAuthCallback(): Promise<boolean> {
    try {
      // Check if we have a hash with access_token (implicit flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        this.accessToken = accessToken;
        // For implicit flow, we need to ensure we have a user session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Try to refresh the session
          const { data: sessionData } = await supabase.auth.refreshSession();
          if (!sessionData.session) {
            return false;
          }
        }
        return true;
      }

      // Check for session-based auth
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        return false;
      }

      if (data.session?.provider_token) {
        this.accessToken = data.session.provider_token;
        return true;
      }

      // Try to get user and session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // We have a user but no provider token, try to refresh
        const { data: sessionData } = await supabase.auth.refreshSession();
        if (sessionData.session?.provider_token) {
          this.accessToken = sessionData.session.provider_token;
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Auth callback handling error:', error);
      return false;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user && !!this.accessToken;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async loadStoredTokens(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        return false;
      }

      if (data.session.provider_token) {
        this.accessToken = data.session.provider_token;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error loading stored tokens:', error);
      return false;
    }
  }

  async getUserProfile(): Promise<{ name: string; email: string; avatar: string }> {
    // Try to refresh session first
    await supabase.auth.refreshSession();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Supabase getUser error:', error);
      throw error;
    }
    if (!data.user) {
      console.error('No authenticated user in Supabase session:', data);
      throw new Error('No authenticated user');
    }
    return {
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Unknown User',
      email: data.user.email || '',
      avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || ''
    };
  }

  // Ensures the access token is valid, refreshes if needed
  private async ensureValidToken(): Promise<void> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('No session');
    // If we have a provider_token, use it
    if (data.session.provider_token) {
      this.accessToken = data.session.provider_token;
      return;
    }
    // Try to refresh session
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session || !refreshed.session.provider_token) {
      throw new Error('Could not refresh session');
    }
    this.accessToken = refreshed.session.provider_token;
  }

  async getMessages(maxResults: number = 50): Promise<ParsedEmail[]> {
    await this.ensureValidToken();
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      // Get list of message IDs
      const listResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (listResponse.status === 401) {
        // Try to refresh token and retry once
        await this.ensureValidToken();
        return this.getMessages(maxResults);
      }

      if (!listResponse.ok) {
        throw new Error(`Gmail API error: ${listResponse.status}`);
      }

      const listData = await listResponse.json();

      if (!listData.messages) {
        return [];
      }

      // Get full message details for each message
      const messagePromises = listData.messages.map(async (message: { id: string }) => {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (messageResponse.status === 401) {
          await this.ensureValidToken();
          return this.getMessages(maxResults);
        }

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`);
          return null;
        }

        const messageData = await messageResponse.json();
        return this.parseMessage(messageData);
      });

      const messages = await Promise.all(messagePromises);
      return messages.filter(Boolean) as ParsedEmail[];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  private parseMessage(message: GmailMessage): ParsedEmail | null {
    if (!message.payload || !message.id) {
      return null;
    }

    const headers = message.payload.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: GmailHeader) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const fromHeader = getHeader('from');
    const subjectHeader = getHeader('subject');
    const dateHeader = getHeader('date');

    // Parse the from field to extract name and email
    const fromMatch = fromHeader.match(/^(.*?)\s*<(.+)>$/) || fromHeader.match(/^(.+)$/);
    const fromName = fromMatch?.[1]?.replace(/"/g, '').trim() || fromHeader;
    const fromEmail = fromMatch?.[2] || fromHeader;

    // Get message body
    const body = this.extractMessageBody(message.payload);
    const preview = message.snippet || body.substring(0, 150);

    // Check if message is read (not in UNREAD label)
    const isUnread = message.labelIds?.includes('UNREAD') || false;
    const isStarred = message.labelIds?.includes('STARRED') || false;

    return {
      id: message.id,
      from: {
        name: fromName,
        email: fromEmail
      },
      subject: subjectHeader,
      preview,
      body,
      date: dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate || '0')),
      read: !isUnread,
      starred: isStarred
    };
  }

  private extractMessageBody(payload: GmailPayload): string {
    let body = '';

    if (payload.body?.data) {
      body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          break;
        } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          // Strip HTML tags for preview
          body = body.replace(/<[^>]*>/g, '');
        }
      }
    }

    return body;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.ensureValidToken();
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 401) {
      await this.ensureValidToken();
      return this.deleteMessage(messageId);
    }

    if (!response.ok) {
      throw new Error(`Failed to delete message: ${response.status}`);
    }
  }

  async deleteMessages(messageIds: string[]): Promise<void> {
    // Gmail API doesn't support batch delete, so we'll delete one by one
    for (const id of messageIds) {
      await this.deleteMessage(id);
    }
  }

  async searchMessages(query: string, searchType: 'all' | 'from' | 'subject' | 'body' = 'all'): Promise<ParsedEmail[]> {
    await this.ensureValidToken();
    if (!this.accessToken || !query.trim()) {
      return [];
    }

    let gmailQuery = '';
    switch (searchType) {
      case 'from':
        gmailQuery = `from:${query}`;
        break;
      case 'subject':
        gmailQuery = `subject:${query}`;
        break;
      case 'body':
        gmailQuery = query;
        break;
      case 'all':
      default:
        gmailQuery = query;
        break;
    }

    try {
      const listResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox ${encodeURIComponent(gmailQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (listResponse.status === 401) {
        await this.ensureValidToken();
        return this.searchMessages(query, searchType);
      }

      if (!listResponse.ok) {
        throw new Error(`Gmail API error: ${listResponse.status}`);
      }

      const listData = await listResponse.json();

      if (!listData.messages) {
        return [];
      }

      const messagePromises = listData.messages.map(async (message: { id: string }) => {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (messageResponse.status === 401) {
          await this.ensureValidToken();
          return this.searchMessages(query, searchType);
        }

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`);
          return null;
        }

        const messageData = await messageResponse.json();
        return this.parseMessage(messageData);
      });

      const messages = await Promise.all(messagePromises);
      return messages.filter(Boolean) as ParsedEmail[];
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    this.accessToken = null;
  }

  async refreshSession() {
    try {
      await supabase.auth.refreshSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }

  // Utility to check for Supabase session cookies and log a warning if missing
  checkSupabaseSessionCookies() {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const hasSupabaseCookie = cookies.some(c => c.startsWith('sb-'));
    if (!hasSupabaseCookie) {
      console.warn('Supabase session cookie is missing! Authentication will not work.');
    } else {
      console.info('Supabase session cookie found.');
    }
  }
}

export const gmailAuthService = new GmailAuthService(); 