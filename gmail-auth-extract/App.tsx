import React, { useEffect } from 'react';

// Call this after authentication and on initial load
useEffect(() => {
  gmailAuthService.checkSupabaseSessionCookies();
}, []);

const handleAuthSuccess = async () => {
  // Clear the hash from URL
  window.history.replaceState({}, document.title, window.location.pathname);

  // Always refresh session after OAuth callback
  await gmailAuthService.refreshSession();

  // Check for session cookies
  gmailAuthService.checkSupabaseSessionCookies();

  const isAuth = await gmailAuthService.isAuthenticated();
  if (isAuth) {
    await handleLogin();
  } else {
    setAuthError('Authentication failed. Please try logging in again.');
  }
}; 