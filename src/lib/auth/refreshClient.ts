'use client';

import {
  removeAccessToken,
  removeEjentoAccessToken,
  clearUserFromCookie,
} from '@/cookie';

/**
 * Single-flight token refresh.
 *
 * Many API calls can 401 at once; we want exactly ONE refresh request. The
 * in-flight promise is shared by all callers and cleared once it settles.
 */
let inflight: Promise<boolean> | null = null;

export function refreshTokens(): Promise<boolean> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      return data?.success === true;
    } catch {
      return false;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Called when refresh is not possible (refresh anchor expired/invalid).
 * Clears local auth cookies and sends the user back to login.
 */
export function onRefreshFailed(): void {
  removeAccessToken();
  removeEjentoAccessToken();
  clearUserFromCookie();
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}
