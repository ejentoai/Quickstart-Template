import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// APIs that don't need Authorization token - because token will be available after login
//so login pages donot require tokens
const NO_AUTH_ROUTES = [
  'auth-service/api/v2/users/passwordless-auth',
  'auth-service/api/v2/users/verify-otp',
  'auth-service/api/v2/users/validate-magic-link',
  'auth-service/api/v2/feature-flags/logins',
];

// HTTP methods
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'GET');
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'POST');
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PUT');
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'DELETE');
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PATCH');
};

/**
 * Retrieves API credentials from server-side sources
 * SECURITY: Credentials are never sent from client, only retrieved server-side
 * - NEXT_PUBLIC_ENV_DRIVEN=true: Reads from environment variables
 * - NEXT_PUBLIC_ENV_DRIVEN=false: Reads from secure httpOnly cookies (set after validation)
 */
async function getServerSideCredentials(): Promise<{
  baseUrl: string;
  authorization: string;
  apiKey: string;
} | null> {
  // Check if NEXT_PUBLIC_ENV_DRIVEN mode is enabled
  const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true' || process.env.NEXT_PUBLIC_ENV_DRIVEN === '1';
  
  if (envDriven) {
    // NEXT_PUBLIC_ENV_DRIVEN=true: Get credentials from environment variables
    const baseUrl = process.env.EJENTO_BASE_URL;
    const apiKey = process.env.EJENTO_API_KEY;
    const ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN;
    
    if (baseUrl && apiKey && ejentoAccessToken) {
      return {
        baseUrl: baseUrl.trim(),
        authorization: ejentoAccessToken.trim(),
        apiKey: apiKey.trim(),
      };
    }
  } else {
    // NEXT_PUBLIC_ENV_DRIVEN=false: Get credentials from secure httpOnly cookies
    const cookieStore = await cookies();
    const credentialsCookie = cookieStore.get('ejento_api_credentials');
    
    if (credentialsCookie?.value) {
      try {
        const credentials = JSON.parse(cookieValue);
        baseUrl = credentials.baseUrl?.trim();
        apiKey = credentials.apiKey?.trim();
        ejentoAccessToken = credentials.ejentoAccessToken?.trim();
      } catch (error) {
        console.error('Failed to parse credentials cookie:', error);
      }
    }
  }

  if (!baseUrl || !apiKey) return null;
  if (authFlowEnabled) return { baseUrl, apiKey };
  if (!ejentoAccessToken) return null;

  return { baseUrl, apiKey, authorization: ejentoAccessToken };
}
/**
 * Core proxy function
 */
async function proxyRequest(request: NextRequest, pathArray: string[], method: string) {
  try {
    const credentials = await getServerSideCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'API credentials not configured' }, { status: 401 });
    }

    const { baseUrl, apiKey } = credentials;
    const cookieStore = await cookies();


    // Build full path
    const path = pathArray.join('/');
    const targetUrl = `${baseUrl}/${path}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

    const contentType = request.headers.get('content-type') || 'application/json';

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    // Only add Authorization if NOT in NO_AUTH_ROUTES
    const isNoAuthRoute = NO_AUTH_ROUTES.some(route => path.includes(route));
    if (!isNoAuthRoute) {
      let authorization = credentials.authorization;

      // Override with cookie token if NEXT_PUBLIC_AUTH_FLOW=true
      if (process.env.NEXT_PUBLIC_AUTH_FLOW === 'true') {
        try{
          const tokenFromCookie = cookieStore.get('ejento_access_token');
          if (tokenFromCookie?.value) {
            const ejento_cookie = tokenFromCookie.value
            const temp_authorization = ejento_cookie;
            authorization = `Bearer ${temp_authorization}`
          }
        }
        catch(error){
          console.error('Failed to parse credentials cookie:', error);
        }  
      }
      headers['Authorization'] = authorization || '';
    }


    // Prepare fetch options
    const fetchOptions: RequestInit = { method, headers };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) fetchOptions.body = body;
    }

    const response = await fetch(fullUrl, fetchOptions);
    const contentTypeHeader = response.headers.get('content-type');

    // Streaming response handling
    const isStreaming =
      contentTypeHeader?.includes('text/event-stream') ||
      contentTypeHeader?.includes('text/plain') ||
      response.headers.get('cache-control')?.includes('no-cache');

    if (isStreaming) {
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) return controller.close();

          async function pump() {
            const result = await reader?.read();
            if(!result){
              console.error('no reader available')
              return
            }
            const {done, value} = result
            if (done) return controller.close();
            controller.enqueue(value);
            await pump();
          }
          await pump();
        },
      });

      return new Response(stream, {
        status: response.status,
        headers: {
          'Content-Type': contentTypeHeader || 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Non-streaming response
    let data;
    if (contentTypeHeader?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return NextResponse.json(data, { status: response.status, headers: { 'Content-Type': contentTypeHeader || 'application/json' } });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
