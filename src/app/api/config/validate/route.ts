import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserConfig } from '@/app/context/ConfigContext';
import axios from 'axios';

/**
 * Server-side validation endpoint for environment-based configuration
 * Performs the same validations as manual config (credentials + agent)
 * This ensures env-based config is validated before the app uses it
 * 
 * SECURITY: When ENV_DRIVEN=false, stores validated credentials in secure httpOnly cookies
 * so they are not vulnerable to being exposed in the browser network tab
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config: UserConfig = body.config;

    // Check if this is environment-driven config (credentials are server-side only)
    const envDriven = process.env.ENV_DRIVEN === 'true' || process.env.ENV_DRIVEN === '1';
    
    let baseUrl: string;
    let apiKey: string;
    let ejentoAccessToken: string;
    let agentId: string;

    if (envDriven) {
      // For environment-driven config, read credentials from server-side environment variables
      // Client config may have empty values (for security), but we use server-side values
      baseUrl = process.env.EJENTO_BASE_URL?.trim() || '';
      apiKey = process.env.EJENTO_API_KEY?.trim() || '';
      ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN?.trim() || '';
      agentId = process.env.EJENTO_AGENT_ID?.trim() || '';
    } else {
      // For manual config, use values from request body
      baseUrl = config?.baseUrl?.trim() || '';
      apiKey = config?.apiKey?.trim() || '';
      ejentoAccessToken = config?.ejentoAccessToken?.trim() || '';
      agentId = config?.agentId?.trim() || '';
    }

    if (!baseUrl || !apiKey || !ejentoAccessToken || !agentId) {
      return NextResponse.json(
        {
          success: false,
          message: envDriven 
            ? 'Missing required environment variables.'
            : 'Missing required configuration values.',
          userData: null,
        },
        { status: 400 }
      );
    }

    // For server-side validation, always use direct API calls (no proxy)
    // Build headers directly with credentials for server-side validation
    // The proxy is only for client-side CORS issues
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': ejentoAccessToken,
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    // 1. Validate credentials by fetching current user
    let userData = null;
    try {
      const userUrl = `${baseUrl}/api/v2/users/me`;
      
      // Add debug logging in development
      if (process.env.NODE_ENV === 'development') {
        // console.log('[Config Validation] Attempting to validate credentials:', {
        //   url: userUrl,
        //   hasApiKey: !!apiKey,
        //   hasToken: !!ejentoAccessToken,
        //   apiKeyLength: apiKey?.length,
        //   tokenLength: ejentoAccessToken?.length,
        //   envDriven: envDriven,
        // });
      }
      
      const userResponse = await axios.get(userUrl, { 
        headers,
        timeout: 10000, // 10 second timeout
      });
      userData = userResponse.data;
      
      // Check if response indicates an error (status code returned as number)
      if (!userData || typeof userData === 'number' || Number.isInteger(userData)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Could not verify credentials. Please check your API key and access token.',
            userData: null,
          },
          { status: 401 }
        );
      }
      
      // Log success in development
      if (process.env.NODE_ENV === 'development') {
        // console.log('[Config Validation] Credentials validated successfully');
      }
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      let errorMessage = 'Failed to verify credentials';
      
      // Provide more detailed error messages
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = `Cannot connect to server. Please check that the server is reachable.`;
      } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        errorMessage = `Request timed out while connecting to server. Please check your network connection.`;
      } else if (error.response) {
        // HTTP error response
        errorMessage = error.response.data?.message || error.response.data?.error || error.response.statusText || 'Failed to verify credentials';
        
        // Add specific guidance based on status code
        if (statusCode === 401) {
          errorMessage = 'Invalid credentials. Please verify your API key and access token are correct.';
        } else if (statusCode === 403) {
          errorMessage = 'Access forbidden. Your credentials may not have permission to access this resource.';
        } else if (statusCode === 404) {
          errorMessage = `API endpoint not found. Please verify server is reachable. Attempted: /api/v2/users/me`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Log detailed error in development
      if (process.env.NODE_ENV === 'development') {
        // console.error('[Config Validation] Credential validation error:', {
        //   statusCode,
        //   errorMessage,
        //   errorCode: error.code,
        //   url: `/api/v2/users/me`,
        //   response: error.response?.data,
        // });
      }
      
      return NextResponse.json(
        {
          success: false,
          message: `Credential validation failed: ${errorMessage}`,
          userData: null,
        },
        { status: statusCode }
      );
    }

    // 2. Validate agent exists and is accessible
    try {
      const agentUrl = `${baseUrl}/api/v2/agents/${agentId}`;
      const agentResponse = await axios.get(agentUrl, { headers });
      const agentData = agentResponse.data;
      
      if (!agentData || !agentData.success || !agentData.data) {
        const errorMessage = agentData?.message || 'Agent could not be retrieved';
        return NextResponse.json(
          {
            success: false,
            message: `Invalid agent ID: ${errorMessage}`,
            userData: null,
          },
          { status: 404 }
        );
      }
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || 'Failed to retrieve agent';
      
      return NextResponse.json(
        {
          success: false,
          message: `Agent validation failed: ${errorMessage}`,
          userData: null,
        },
        { status: statusCode }
      );
    }

    // Both validations passed
    // If ENV_DRIVEN=false, store credentials securely in httpOnly cookies
    // This prevents credentials from being visible in browser network tab
    if (!envDriven) {
      const cookieStore = await cookies();
      
      // Store credentials in secure httpOnly cookies
      // These cookies are only accessible server-side and never exposed to JavaScript
      cookieStore.set('ejento_api_credentials', JSON.stringify({
        baseUrl: baseUrl,
        apiKey: apiKey,
        ejentoAccessToken: ejentoAccessToken,
        agentId: agentId,
      }), {
        httpOnly: true, // Prevents JavaScript access
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    // Return user data for storage
    // Store the full userData object so the sidebar can display all user information
    // The sidebar expects the full API response structure with first_name, last_name, etc.
    const response = NextResponse.json({
      success: true,
      message: 'Configuration validated successfully',
      userData: userData || null, // Return full userData object from API
    });
    // console.log('response', response);

    return response;
  } catch (error: any) {
    console.error('Config validation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred during validation',
        userData: null,
      },
      { status: 500 }
    );
  }
}


