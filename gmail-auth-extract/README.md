# Gmail Authentication Components

This directory contains reusable Gmail authentication components that you can copy into your new project.

## Files Included

- `GmailAuthService.ts` - Main service for Gmail API authentication and operations
- `AuthCallback.tsx` - React component for handling OAuth callbacks
- `LoginScreen.tsx` - React component for the login screen
- `README.md` - This setup guide

## Setup Instructions

### 1. Install Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.344.0"
  }
}
```

### 2. Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GMAIL_API_KEY=your_gmail_api_key
```

### 3. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Go to Authentication > Providers
3. Enable Google provider
4. Add your Google OAuth credentials (Client ID and Secret)
5. Set the redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

### 4. Google OAuth Setup

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Create a new project or select existing one
3. Enable Gmail API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Set authorized redirect URIs to include your Supabase auth callback URL
6. Copy the Client ID and Secret to Supabase

### 5. Copy Files

Copy the files from this directory to your project:

```bash
cp GmailAuthService.ts src/services/
cp AuthCallback.tsx src/components/
cp LoginScreen.tsx src/components/
```

### 6. Basic Usage Example

Here's how to use the components in your main App component:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { AuthCallback } from './components/AuthCallback';
import { gmailAuthService, User } from './services/GmailAuthService';
import { Loader2 } from 'lucide-react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check if we're handling an OAuth callback
  const isAuthCallback = window.location.hash.includes('access_token') || window.location.hash.includes('error');

  const checkExistingAuth = useCallback(async () => {
    try {
      const hasValidTokens = await gmailAuthService.loadStoredTokens();
      if (hasValidTokens) {
        const isAuth = await gmailAuthService.isAuthenticated();
        if (isAuth) {
          await loadUserProfile();
        }
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthCallback) {
      setIsLoading(false);
    } else {
      checkExistingAuth();
    }
  }, [isAuthCallback, checkExistingAuth]);

  const loadUserProfile = async () => {
    try {
      const isAuth = await gmailAuthService.isAuthenticated();
      if (!isAuth) {
        throw new Error('User not properly authenticated');
      }

      const profile = await gmailAuthService.getUserProfile();
      const user: User = {
        id: '1',
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar
      };
      setUser(user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw error;
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      await loadUserProfile();
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Failed to load user profile. Please try logging in again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await gmailAuthService.logout();
    setUser(null);
    setIsLoggedIn(false);
    setAuthError(null);
  };

  const handleAuthSuccess = async () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    
    try {
      setIsLoading(true);
      setAuthError(null);
      await loadUserProfile();
    } catch (error) {
      console.error('Auth success error:', error);
      setAuthError('Authentication successful but failed to load user profile. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: string) => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setAuthError(error);
    setIsLoading(false);
  };

  // Show loading screen
  if (isLoading && !isAuthCallback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading</h2>
          <p className="text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // Handle OAuth callback
  if (isAuthCallback) {
    return (
      <AuthCallback
        onAuthSuccess={handleAuthSuccess}
        onAuthError={handleAuthError}
      />
    );
  }

  // Show error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <button
            onClick={() => {
              setAuthError(null);
              setIsLoading(false);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show main application
  if (isLoggedIn && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}!</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Logout
            </button>
          </div>
          <p className="text-gray-600">You are now authenticated with Gmail!</p>
          {/* Add your Gmail-related features here */}
        </div>
      </div>
    );
  }

  return <LoginScreen onLogin={handleLogin} />;
}

export default App;
```

## Available Methods

### GmailAuthService

- `signInWithGoogle()` - Initiates Google OAuth flow
- `handleAuthCallback()` - Handles OAuth callback
- `isAuthenticated()` - Checks if user is authenticated
- `loadStoredTokens()` - Loads stored authentication tokens
- `getUserProfile()` - Gets user profile information
- `getMessages(maxResults)` - Fetches Gmail messages
- `searchMessages(query, searchType)` - Searches Gmail messages
- `deleteMessage(messageId)` - Deletes a Gmail message
- `deleteMessages(messageIds)` - Deletes multiple Gmail messages
- `logout()` - Logs out the user

## Features

- ✅ Automatic token refresh
- ✅ 401 error handling with retry logic
- ✅ Robust authentication flow
- ✅ TypeScript support
- ✅ Tailwind CSS styling
- ✅ Loading states and error handling

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Make sure your `.env` file has the correct Supabase URL and anon key

2. **"OAuth error"**
   - Check your Google OAuth credentials in Supabase
   - Verify redirect URLs are correctly configured

3. **"No authenticated user"**
   - This usually means the session isn't properly established
   - Try refreshing the page or logging in again

4. **401 Unauthorized from Gmail API**
   - The service automatically handles token refresh
   - If persistent, check your Gmail API scopes

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify your environment variables
3. Ensure Supabase and Google OAuth are properly configured
4. Check that Gmail API is enabled in Google Cloud Console 