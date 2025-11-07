/**
 * Hook for managing automatic token refresh in PUBLIC_AGENT mode
 * 
 * Runs a background timer that refreshes the Ejento access token every 2 days.
 * Updates ConfigContext with the new token automatically.
 */

import { useEffect, useRef } from 'react';
import { useConfig } from '@/app/context/ConfigContext';
import { refreshEjentoToken, shouldRefreshToken, getTokenRefreshInterval } from '@/lib/token-refresh';
import { isPublicAgentMode } from '@/lib/storage/indexeddb';

export function useTokenRefresh() {
  const { config, updateConfig, isEnvConfigured } = useConfig();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Only run in PUBLIC_AGENT mode and when env config is available
    if (!isPublicAgentMode() || !isEnvConfigured || !config) {
      return;
    }

    const scheduleRefresh = async () => {
      // Check if refresh is needed
      const needsRefresh = await shouldRefreshToken();
      
      if (!needsRefresh) {
        // Schedule refresh for the remaining time
        const { getSessionMetadata } = await import('@/lib/storage/indexeddb');
        const metadata = await getSessionMetadata();
        
        if (metadata && metadata.lastTokenRefresh) {
          const interval = getTokenRefreshInterval();
          const timeSinceRefresh = Date.now() - metadata.lastTokenRefresh;
          const remainingTime = interval - timeSinceRefresh;
          
          // Schedule refresh for remaining time
          if (remainingTime > 0) {
            intervalRef.current = setTimeout(() => {
              performRefresh();
            }, remainingTime);
          } else {
            // Should refresh now
            performRefresh();
          }
        } else {
          // Never refreshed, refresh now
          performRefresh();
        }
      } else {
        // Should refresh now
        performRefresh();
      }
    };

    const performRefresh = async () => {
      // Prevent multiple simultaneous refresh attempts
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        const newToken = await refreshEjentoToken();
        
        if (newToken && config) {
          // Update ConfigContext with new token
          updateConfig({
            ejentoAccessToken: newToken,
          });
          
          console.log('Token refreshed successfully');
        } else {
          console.warn('Token refresh failed, will retry on next interval');
        }
      } catch (error) {
        console.error('Error performing token refresh:', error);
      } finally {
        isRefreshingRef.current = false;
        
        // Schedule next refresh (2 days from now)
        const interval = getTokenRefreshInterval();
        intervalRef.current = setTimeout(() => {
          performRefresh();
        }, interval);
      }
    };

    // Initial check and schedule
    scheduleRefresh();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config, isEnvConfigured, updateConfig]);
}

