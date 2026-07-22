// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the cookie helpers so onRefreshFailed doesn't touch real js-cookie.
vi.mock('@/cookie', () => ({
  removeAccessToken: vi.fn(),
  removeEjentoAccessToken: vi.fn(),
  clearUserFromCookie: vi.fn(),
}));

import { refreshTokens, onRefreshFailed } from '@/lib/auth/refreshClient';
import {
  removeAccessToken,
  removeEjentoAccessToken,
  clearUserFromCookie,
} from '@/cookie';

describe('refreshTokens (single-flight)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces concurrent calls into a single fetch', async () => {
    let resolveFetch!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFetch = r;
    });
    global.fetch = vi.fn(() => pending as any);

    // Two callers race before the request settles.
    const p1 = refreshTokens();
    const p2 = refreshTokens();

    resolveFetch({ ok: true, json: async () => ({ success: true }) });

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });

  it('releases the lock so a later call issues a new fetch', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await refreshTokens();
    await refreshTokens();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns false when the refresh endpoint responds non-OK', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    expect(await refreshTokens()).toBe(false);
  });

  it('returns false when the response body is not success', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: false }) });

    expect(await refreshTokens()).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    expect(await refreshTokens()).toBe(false);
  });
});

describe('onRefreshFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  it('clears auth cookies and redirects to login', () => {
    onRefreshFailed();

    expect(removeAccessToken).toHaveBeenCalledTimes(1);
    expect(removeEjentoAccessToken).toHaveBeenCalledTimes(1);
    expect(clearUserFromCookie).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/auth/login');
  });
});
