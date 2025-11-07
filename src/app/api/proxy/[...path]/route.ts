import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PATCH');
}

/**
 * Retrieves API credentials from server-side sources
 * SECURITY: Credentials are never sent from client, only retrieved server-side
 * - ENV_DRIVEN=true: Reads from environment variables
 * - ENV_DRIVEN=false: Reads from secure httpOnly cookies (set after validation)
 */
async function getServerSideCredentials(): Promise<{
  baseUrl: string;
  authorization: string;
  apiKey: string;
} | null> {
  // Check if ENV_DRIVEN mode is enabled
  const envDriven = process.env.ENV_DRIVEN === 'true' || process.env.ENV_DRIVEN === '1';
  
  if (envDriven) {
    // ENV_DRIVEN=true: Get credentials from environment variables
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
    // ENV_DRIVEN=false: Get credentials from secure httpOnly cookies
    const cookieStore = await cookies();
    const credentialsCookie = cookieStore.get('ejento_api_credentials');
    
    if (credentialsCookie?.value) {
      try {
        const credentials = JSON.parse(credentialsCookie.value);
        if (credentials.baseUrl && credentials.apiKey && credentials.ejentoAccessToken) {
          return {
            baseUrl: credentials.baseUrl,
            authorization: credentials.ejentoAccessToken,
            apiKey: credentials.apiKey,
          };
        }
      } catch (error) {
        console.error('Failed to parse credentials cookie:', error);
      }
    }
  }
  
  return null;
}

async function proxyRequest(
  request: NextRequest,
  pathArray: string[],
  method: string
) {
  try {
    // SECURITY: Get credentials from server-side sources only
    // Client should NOT send Authorization or Ocp-Apim-Subscription-Key headers
    const credentials = await getServerSideCredentials();
    
    if (!credentials) {
      return NextResponse.json(
        { error: 'API credentials not configured. Please configure your credentials in settings or environment variables.' },
        { status: 401 }
      );
    }

    const { baseUrl, authorization, apiKey } = credentials;
    const contentType = request.headers.get('content-type');

    // Construct the full path
    const path = pathArray.join('/');
    const targetUrl = `${baseUrl}/${path}`;

    // Preserve query parameters
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

    // Prepare headers for the proxied request
    // SECURITY: Credentials are retrieved server-side, never from client headers
    const headers: HeadersInit = {
      'Content-Type': contentType || 'application/json',
      'Authorization': authorization,
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    // Prepare the fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for methods that support it
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          fetchOptions.body = body;
        }
      } catch (error) {
        console.error('Error reading request body:', error);
      }
    }

    // Make the proxied request
    const response = await fetch(fullUrl, fetchOptions);

    // Check if this is a streaming response
    const contentTypeHeader = response.headers.get('content-type');
    const isStreaming = contentTypeHeader?.includes('text/event-stream') || 
                       contentTypeHeader?.includes('text/plain') ||
                       response.headers.get('cache-control')?.includes('no-cache');

    if (isStreaming) {
      // Create a readable stream for Server-Sent Events
      const stream = new ReadableStream({
        start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          function pump(): Promise<void> {
            return reader!.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              return pump();
            }).catch((error) => {
              console.error('Stream pump error:', error);
              controller.error(error);
            });
          }

          return pump();
        }
      });

      return new Response(stream, {
        status: response.status,
        headers: {
          'Content-Type': contentTypeHeader || 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Handle non-streaming responses
    let data;
    if (contentTypeHeader?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }


    // Return the response with the same status code
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': contentTypeHeader || 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

