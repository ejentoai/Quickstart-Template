/**
 * Token Refresh Utilities
 * 
 * Handles automatic token refresh for PUBLIC_AGENT mode.
 * Refreshes the author's Ejento access token every 2 days.
 */

import { createOrUpdateSessionMetadata } from './storage/indexeddb';

const DEFAULT_REFRESH_INTERVAL = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

/**
 * Gets the token refresh interval from environment variable or returns default
 */
export function getTokenRefreshInterval(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_REFRESH_INTERVAL;
  }

  const envInterval = process.env.NEXT_PUBLIC_AGENT_TOKEN_REFRESH_INTERVAL;
  if (envInterval) {
    const parsed = parseInt(envInterval, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_REFRESH_INTERVAL;
}

/**
 * Refreshes the Ejento access token via API
 * Returns the new access token or null if refresh failed
 */
export async function refreshEjentoToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/config/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || 'Failed to refresh token');
    }

    const data = await response.json();
    
    if (data.success && data.accessToken) {
      // Update session metadata with refresh timestamp
      await createOrUpdateSessionMetadata({
        lastTokenRefresh: Date.now(),
      });

      return data.accessToken;
    }

    throw new Error(data.message || 'Token refresh failed');
  } catch (error) {
    console.error('Error refreshing Ejento token:', error);
    return null;
  }
}

/**
 * Checks if token refresh is needed based on last refresh timestamp
 */
export async function shouldRefreshToken(): Promise<boolean> {
  try {
    const { getSessionMetadata } = await import('./storage/indexeddb');
    const metadata = await getSessionMetadata();
    
    if (!metadata || !metadata.lastTokenRefresh) {
      // Never refreshed, should refresh
      return true;
    }

    const interval = getTokenRefreshInterval();
    const timeSinceRefresh = Date.now() - metadata.lastTokenRefresh;
    
    return timeSinceRefresh >= interval;
  } catch (error) {
    console.error('Error checking token refresh status:', error);
    // If we can't check, assume refresh is needed
    return true;
  }
}

