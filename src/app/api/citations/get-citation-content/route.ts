import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();

  // Auth-flow mode: token is in ejento_access_token cookie
  if (process.env.NEXT_PUBLIC_AUTH_FLOW === 'true') {
    return cookieStore.get('ejento_access_token')?.value ?? null;
  }

  // Env-driven mode: token is in env var (may already include "Bearer " prefix)
  if (process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true') {
    const raw = process.env.EJENTO_ACCESS_TOKEN?.trim() ?? '';
    return raw.startsWith('Bearer ') ? raw.slice(7) : raw || null;
  }

  // Cookie-driven mode: token is in ejento_api_credentials cookie
  const cookieValue = cookieStore.get('ejento_api_credentials')?.value;
  if (cookieValue) {
    try {
      const creds = JSON.parse(cookieValue);
      return creds.ejentoAccessToken?.trim() ?? null;
    } catch {}
  }

  return null;
}

async function getApiCredentials(): Promise<{ baseUrl: string; apiKey: string } | null> {
  // When env-driven, use env vars directly
  if (process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true') {
    const baseUrl = process.env.EJENTO_BASE_URL?.trim();
    const apiKey = process.env.EJENTO_API_KEY?.trim();
    if (baseUrl && apiKey) return { baseUrl, apiKey };
  }

  // Otherwise read from cookie (same as main proxy route)
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get('ejento_api_credentials')?.value;
  if (cookieValue) {
    try {
      const creds = JSON.parse(cookieValue);
      const baseUrl = creds.baseUrl?.trim();
      const apiKey = creds.apiKey?.trim();
      if (baseUrl && apiKey) return { baseUrl, apiKey };
    } catch {}
  }

  // Fallback to env vars
  const baseUrl = process.env.EJENTO_BASE_URL?.trim();
  const apiKey = process.env.EJENTO_API_KEY?.trim();
  if (baseUrl && apiKey) return { baseUrl, apiKey };

  return null;
}

export async function GET(req: NextRequest) {
  let format: string | null = null;

  try {
    const accessToken = await getAccessToken();
    const apiCreds = await getApiCredentials();
    const apiKey = apiCreds?.apiKey;
    const baseUrl = apiCreds?.baseUrl;

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const container = searchParams.get('container');
    format = searchParams.get('format');
    const convertToPdf = searchParams.get('convert_to_pdf') === 'true';

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }
    if (!accessToken || !apiKey || !baseUrl) {
      console.error('[get-citation-content] missing credentials', { hasToken: !!accessToken, hasKey: !!apiKey, hasUrl: !!baseUrl });
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
    }

    const headers = {
      'Ocp-Apim-Subscription-Key': apiKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: '*/*',
    };

    const params = new URLSearchParams();
    if (container) params.set('storage_container', container);
    if (convertToPdf) params.set('convert_to_pdf', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const url = `${baseUrl}/api/v2/citation/${name}${queryString}`;

    const response = await axios.get(url, { headers, responseType: 'arraybuffer' });

    const isFile = format === 'file';
    const fallbackType = isFile ? 'application/octet-stream' : 'image/png';
    const contentType = String(response.headers?.['content-type'] || fallbackType);

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
      },
    });
  } catch (error: any) {
    console.error('[get-citation-content] error:', error?.message || error);
    const message = format === 'file' ? 'Error downloading the file' : 'Error downloading image';
    return NextResponse.json({ error: message }, { status: error?.response?.status || 500 });
  }
}
