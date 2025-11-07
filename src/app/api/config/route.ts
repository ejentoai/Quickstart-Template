import { NextResponse } from 'next/server';
import { UserConfig } from '@/app/context/ConfigContext';

/**
 * API endpoint to securely provide configuration from server-side environment variables
 * This endpoint runs on the server and never exposes credentials to the client bundle
 */
export async function GET() {
  // Check if environment-driven mode is explicitly enabled
  const envDriven = process.env.ENV_DRIVEN === 'true' || process.env.ENV_DRIVEN === '1';
  
  // If ENV_DRIVEN is explicitly false, return null immediately (use manual config)
  if (process.env.ENV_DRIVEN === 'false' || process.env.ENV_DRIVEN === '0') {
    return NextResponse.json({
      config: null,
      source: 'manual' as const,
      envDrivenEnabled: false,
    });
  }

  // Read server-side environment variables
  const baseUrl = process.env.EJENTO_BASE_URL;
  const apiKey = process.env.EJENTO_API_KEY;
  const ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN;
  const agentId = process.env.EJENTO_AGENT_ID;

  // If ENV_DRIVEN is true, require all env vars to be set
  // If ENV_DRIVEN is not set (auto-detect), check if all vars are present
  if (envDriven || (baseUrl && apiKey && ejentoAccessToken && agentId)) {
    // Only return config if all required environment variables are set
    if (baseUrl && apiKey && ejentoAccessToken && agentId) {
      // Normalize baseUrl: remove trailing slashes
      let normalizedBaseUrl = baseUrl.trim();
      normalizedBaseUrl = normalizedBaseUrl.replace(/\/+$/, '');
      
      // SECURITY: For environment-driven config, never expose sensitive credentials to client
      // baseUrl, apiKey, and ejentoAccessToken remain server-side only (used via proxy)
      // agentId is not sensitive and can be exposed to client for API calls
      const config: Partial<UserConfig> = {
        // Sensitive credentials are excluded - they remain server-side only
        // baseUrl, apiKey, and ejentoAccessToken are NOT included (proxy handles these)
        baseUrl: '', // Empty string - proxy will use server-side baseUrl from env vars
        agentId: agentId.trim(), // agentId is not sensitive, can be exposed to client
        // User info will be fetched during validation phase
        userInfo: undefined,
      };

      return NextResponse.json({
        config,
        source: 'environment' as const,
        envDrivenEnabled: true,
      });
    }
    
    // If ENV_DRIVEN is true but vars are missing, return error
    if (envDriven) {
      return NextResponse.json(
        {
          config: null,
          source: 'manual' as const,
          envDrivenEnabled: true,
          error: 'ENV_DRIVEN is enabled but required environment variables are missing',
        },
        { status: 500 }
      );
    }
  }

  // Return null if environment variables are not set or ENV_DRIVEN is not enabled
  // Client will fall back to localStorage-based config
  return NextResponse.json({
    config: null,
    source: 'manual' as const,
    envDrivenEnabled: false,
  });
}

/**
 * DELETE endpoint to clear stored credentials
 * Used when user logs out or clears configuration
 * Only clears credentials cookie (ENV_DRIVEN=false scenario)
 * Environment-based credentials (ENV_DRIVEN=true) cannot be cleared via this endpoint
 */
export async function DELETE() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  
  // Clear the credentials cookie
  cookieStore.delete('ejento_api_credentials');
  
  return NextResponse.json({
    success: true,
    message: 'Credentials cleared successfully',
  });
}

