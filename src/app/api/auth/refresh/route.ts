import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Refresh route.
 *
 * Reads the current auth-service access token from the `token` cookie and calls
 * the Ejento refresh endpoint. On success it rewrites BOTH the `token` and
 * `ejento_access_token` cookies (using the same attributes the middleware uses)
 * so the proxy picks up the rotated tokens automatically.
 *
 * Only active when NEXT_PUBLIC_AUTH_FLOW=true.
 */

// Matches the attributes used by middleware.ts when it first sets these cookies.
const COOKIE_OPTS = {
  path: '/',
  maxAge: 7 * 86400,
  secure: true,
  sameSite: 'none',
} as const;

export async function POST() {
  const authFlowEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
  if (!authFlowEnabled) {
    return NextResponse.json(
      { success: false, message: 'Auth flow disabled' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  // Resolve baseUrl + apiKey the same way the proxy does.
  const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';
  let baseUrl: string | undefined;
  let apiKey: string | undefined;

  if (envDriven) {
    baseUrl = process.env.EJENTO_BASE_URL?.trim();
    apiKey = process.env.EJENTO_API_KEY?.trim();
  } else {
    const cookieValue = cookieStore.get('ejento_api_credentials')?.value;
    if (cookieValue) {
      try {
        const credentials = JSON.parse(cookieValue);
        baseUrl = credentials.baseUrl?.trim();
        apiKey = credentials.apiKey?.trim();
      } catch (error) {
        console.error('Failed to parse credentials cookie:', error);
      }
    }
  }

  if (!token || !baseUrl || !apiKey) {
    return NextResponse.json(
      { success: false, message: 'Missing credentials' },
      { status: 401 }
    );
  }

  try {
    const url = `${baseUrl}/auth-service/api/v2/users/refresh-access-token`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!upstream.ok) {
      // Refresh anchor is dead -> clear cookies so the client logs out cleanly.
      const res = NextResponse.json(
        { success: false, message: 'Refresh failed' },
        { status: upstream.status }
      );
      res.cookies.set('token', '', { path: '/', maxAge: 0 });
      res.cookies.set('ejento_access_token', '', { path: '/', maxAge: 0 });
      return res;
    }

    const data = await upstream.json();
    const newAccess = data?.data?.access_token;
    const newEjento = data?.data?.ejento_access_token;

    if (!newAccess || !newEjento) {
      return NextResponse.json(
        { success: false, message: 'Invalid refresh response' },
        { status: 502 }
      );
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('token', newAccess, COOKIE_OPTS);
    res.cookies.set('ejento_access_token', newEjento, COOKIE_OPTS);
    return res;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Refresh error' },
      { status: 500 }
    );
  }
}
