'use client';

/**
 * Token Refresh Provider
 * 
 * Wrapper component that initializes the token refresh system in PUBLIC_AGENT mode.
 * This component uses the useTokenRefresh hook to manage automatic token refresh.
 */

import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { ReactNode } from 'react';

export function TokenRefreshProvider({ children }: { children: ReactNode }) {
  // Initialize token refresh (hook handles PUBLIC_AGENT mode check internally)
  useTokenRefresh();
  
  return <>{children}</>;
}

