import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/headers so we control the cookie store the route reads.
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { POST } from '@/app/api/auth/refresh/route';

/** Build a minimal cookie store whose .get(name) returns { value } or undefined. */
function cookieStore(map: Record<string, string>) {
  return {
    get: (name: string) =>
      name in map ? { name, value: map[name] } : undefined,
  };
}

function mockUpstream(opts: { ok: boolean; status: number; body?: unknown }) {
  return {
    ok: opts.ok,
    status: opts.status,
    json: async () => opts.body ?? {},
  };
}

const REFRESH_URL =
  'https://api.example.com/auth-service/api/v2/users/refresh-access-token';

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    // Sensible defaults: auth flow on, env-driven creds present.
    vi.stubEnv('NEXT_PUBLIC_AUTH_FLOW', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENV_DRIVEN', 'true');
    vi.stubEnv('EJENTO_BASE_URL', 'https://api.example.com');
    vi.stubEnv('EJENTO_API_KEY', 'test-api-key');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rotates both cookies and returns success on 200', async () => {
    vi.mocked(cookies).mockResolvedValue(
      cookieStore({ token: 'old-auth-token' }) as any
    );
    vi.mocked(global.fetch as any).mockResolvedValue(
      mockUpstream({
        ok: true,
        status: 200,
        body: {
          success: true,
          data: {
            access_token: 'new-auth-token',
            ejento_access_token: 'new-ejento-token',
          },
        },
      })
    );

    const res = await POST();

    // Upstream called correctly: right URL, Bearer = the `token` cookie, api key.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = vi.mocked(global.fetch as any).mock.calls[0];
    expect(calledUrl).toBe(REFRESH_URL);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer old-auth-token');
    expect(init.headers['Ocp-Apim-Subscription-Key']).toBe('test-api-key');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(res.cookies.get('token')?.value).toBe('new-auth-token');
    expect(res.cookies.get('ejento_access_token')?.value).toBe(
      'new-ejento-token'
    );
  });

  it('returns 400 and does not call upstream when auth flow disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_FLOW', 'false');

    const res = await POST();

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 401 without calling upstream when the token cookie is missing', async () => {
    vi.mocked(cookies).mockResolvedValue(cookieStore({}) as any);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears both cookies when upstream rejects the token (401)', async () => {
    vi.mocked(cookies).mockResolvedValue(
      cookieStore({ token: 'dead-token' }) as any
    );
    vi.mocked(global.fetch as any).mockResolvedValue(
      mockUpstream({ ok: false, status: 401 })
    );

    const res = await POST();

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false });
    // Deletion is expressed as an empty-value cookie.
    expect(res.cookies.get('token')?.value).toBe('');
    expect(res.cookies.get('ejento_access_token')?.value).toBe('');
  });

  it('returns 502 when the upstream response is missing tokens', async () => {
    vi.mocked(cookies).mockResolvedValue(
      cookieStore({ token: 'old-auth-token' }) as any
    );
    vi.mocked(global.fetch as any).mockResolvedValue(
      mockUpstream({ ok: true, status: 200, body: { success: true, data: {} } })
    );

    const res = await POST();

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ success: false });
    // No rotation happened.
    expect(res.cookies.get('token')).toBeUndefined();
  });

  it('reads baseUrl/apiKey from the credentials cookie when not env-driven', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENV_DRIVEN', 'false');
    vi.mocked(cookies).mockResolvedValue(
      cookieStore({
        token: 'old-auth-token',
        ejento_api_credentials: JSON.stringify({
          baseUrl: 'https://api.example.com',
          apiKey: 'cookie-api-key',
        }),
      }) as any
    );
    vi.mocked(global.fetch as any).mockResolvedValue(
      mockUpstream({
        ok: true,
        status: 200,
        body: {
          data: {
            access_token: 'new-auth-token',
            ejento_access_token: 'new-ejento-token',
          },
        },
      })
    );

    const res = await POST();

    const [calledUrl, init] = vi.mocked(global.fetch as any).mock.calls[0];
    expect(calledUrl).toBe(REFRESH_URL);
    expect(init.headers['Ocp-Apim-Subscription-Key']).toBe('cookie-api-key');
    expect(res.status).toBe(200);
  });
});
