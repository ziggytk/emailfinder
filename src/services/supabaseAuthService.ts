import { supabase } from './supabaseClient';
import { gmailApiService } from './gmailApi';

export interface SupabaseUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export class SupabaseAuthService {
  /**
   * Sign in to Supabase using Google OAuth
   * This will use the same Google OAuth flow as Gmail
   */
  async signInWithGoogle(): Promise<SupabaseUser | null> {
    try {
      console.log('🔐 Starting Supabase Google OAuth sign in...');
      
      // Get the current Google access token from Gmail service
      const accessToken = gmailApiService.getAccessToken();
      if (!accessToken) {
        console.log('❌ No Google access token available, user needs to sign in to Gmail first');
        return null;
      }

      // Get user profile from Google
      const googleProfile = await gmailApiService.getUserProfile();
      console.log('✅ Got Google profile:', googleProfile);

      // Sign in to Supabase with Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_token: accessToken,
            prompt: 'consent'
          },
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('❌ Supabase Google OAuth error:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ Successfully signed in to Supabase:', data.user.id);
        return {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || googleProfile.name,
          avatar: data.user.user_metadata?.avatar_url || googleProfile.avatar
        };
      }

      // If no user returned, try to get the current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        console.log('✅ Found existing Supabase session:', sessionData.session.user.id);
        return {
          id: sessionData.session.user.id,
          email: sessionData.session.user.email || '',
          name: sessionData.session.user.user_metadata?.full_name || googleProfile.name,
          avatar: sessionData.session.user.user_metadata?.avatar_url || googleProfile.avatar
        };
      }

      console.log('⚠️ No user returned from OAuth, but no error either');
      return null;

    } catch (error) {
      console.error('❌ Failed to sign in to Supabase with Google:', error);
      throw error;
    }
  }

  /**
   * Get the current Supabase user
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Error getting current Supabase user:', error);
        return null;
      }

      if (!user) {
        console.log('ℹ️ No current Supabase user');
        return null;
      }

      console.log('✅ Current Supabase user:', user.id);
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name,
        avatar: user.user_metadata?.avatar_url
      };

    } catch (error) {
      console.error('❌ Failed to get current Supabase user:', error);
      return null;
    }
  }

  /**
   * Sign out from Supabase
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out from Supabase:', error);
        throw error;
      }
      console.log('✅ Successfully signed out from Supabase');
    } catch (error) {
      console.error('❌ Failed to sign out from Supabase:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with Supabase
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch (error) {
      console.error('❌ Error checking Supabase authentication:', error);
      return false;
    }
  }

  /**
   * Get the current Supabase session
   */
  async getSession(): Promise<{ access_token: string; refresh_token: string } | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting Supabase session:', error);
        return null;
      }

      if (!session) {
        console.log('ℹ️ No current Supabase session');
        return null;
      }

      console.log('✅ Got Supabase session');
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      };

    } catch (error) {
      console.error('❌ Failed to get Supabase session:', error);
      return null;
    }
  }

  /**
   * Ensure user is authenticated, sign in if needed
   */
  async ensureAuthenticated(): Promise<SupabaseUser> {
    console.log('🔐 Ensuring Supabase authentication...');
    
    // First check if already authenticated
    let user = await this.getCurrentUser();
    if (user) {
      console.log('✅ Already authenticated with Supabase');
      return user;
    }

    // If not authenticated, try to sign in with Google
    console.log('🔐 Not authenticated, attempting Google OAuth sign in...');
    user = await this.signInWithGoogle();
    
    if (!user) {
      throw new Error('Failed to authenticate with Supabase using Google OAuth');
    }

    console.log('✅ Successfully authenticated with Supabase');
    return user;
  }
}

export const supabaseAuthService = new SupabaseAuthService(); 