import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserConfig } from '@/app/context/ConfigContext';
import axios from 'axios';

/**
 * Server-side validation endpoint for environment-based configuration
 * Performs the same validations as manual config (credentials + agent)
 * This ensures env-based config is validated before the app uses it
 * 
 * SECURITY: When NEXT_PUBLIC_ENV_DRIVEN=false, stores validated credentials in secure httpOnly cookies
 * so they are not vulnerable to being exposed in the browser network tab
 */

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      userData: null,
    },
    { status }
  );
}

function parseAxiosError(error: any, fallback: string) {
  return {
    status: error.response?.status || 500,
    message:
      error.response?.data?.message ||
      error.response?.data?.error ||
      fallback,
  };
}

/**
 * Validate agent existence and accessibility
 * it will be used either authentication is enabled or disabled
 */
async function validateAgent(
  baseUrl: string,
  agentId: string,
  headers: Record<string, string>
) {
  const agentUrl = `${baseUrl}/api/v2/agents/${agentId}`;
  const agentResponse = await axios.get(agentUrl, { headers });
  const agentData = agentResponse.data;

  if (!agentData || !agentData.success || !agentData.data) {
    throw {
      status: 404,
      message: agentData?.message || 'Agent could not be retrieved',
    };
  }

  return agentData;
}

/**
 * Store credentials securely in httpOnly cookies
 * These cookies are only accessible server-side and never exposed to JavaScript
 */
async function storeCredentialsCookie(payload: Record<string, string>) {
  const cookieStore = await cookies();

  cookieStore.set(
    'ejento_api_credentials',
    JSON.stringify(payload),
    {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }
  );
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7); // Generate unique ID for this request
  console.log(`[${requestId}] === Config Validation Request Started ===`);
  
  try {
    // Log request body
    const body = await request.json();
    console.log(`[${requestId}] Request body received:`, JSON.stringify(body, null, 2));
    
    const config: UserConfig = body.config;

    //check if authentication flow is enabled
    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';

    // Check if this is environment-driven config (credentials are server-side only)
    const envDriven =
      process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';

    let baseUrl: string;
    let apiKey: string;
    let ejentoAccessToken: string;
    let agentId: string;

    if (envDriven) {
      // For environment-driven config, read credentials from server-side environment variables
      console.log(`[${requestId}] Reading credentials from environment variables`);
      
      baseUrl = process.env.EJENTO_BASE_URL?.trim() || '';
      apiKey = process.env.EJENTO_API_KEY?.trim() || '';
      ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN?.trim() || '';
      agentId = process.env.EJENTO_AGENT_ID?.trim() || '';
      
      console.log(`[${requestId}] Environment variables loaded:`, {
        baseUrl: baseUrl ? `${baseUrl.substring(0, 20)}...` : 'missing',
        apiKey: apiKey ? 'present' : 'missing',
        apiKeyLength: apiKey?.length,
        ejentoAccessToken: ejentoAccessToken ? 'present' : 'missing',
        tokenLength: ejentoAccessToken?.length,
        agentId: agentId || 'missing',
      });
    } else {
      // For manual config, use values from request body
      console.log(`[${requestId}] Reading credentials from request body`);
      
      baseUrl = config?.baseUrl?.trim() || '';
      apiKey = config?.apiKey?.trim() || '';
      ejentoAccessToken = config?.ejentoAccessToken?.trim() || '';
      agentId = config?.agentId?.trim() || '';
    }

    const hasMissingConfig =
    !baseUrl ||
    !apiKey ||
    !agentId ||
    (!isAuthEnabled && !ejentoAccessToken);
    
    if (hasMissingConfig) {
    return errorResponse(
    envDriven
    ? 'Missing required environment variables.'
    : 'Missing required configuration values.',
    400
    );
    }

    console.log(`[${requestId}] All credentials present, proceeding with validation`);

    // For server-side validation, always use direct API calls (no proxy)
    // Build headers directly with credentials for server-side validation
    // The proxy is only for client-side CORS issues

    if (isAuthEnabled) {
      // if authentication is enabled header will not contain access token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      };

      // validation is done by checking the agent existence
      try {
        await validateAgent(baseUrl, agentId, headers);
      } catch (error: any) {
        return errorResponse(
          `Agent validation failed: ${error.message}`,
          error.status || 500
        );
      }
      
      //after successfull validation
      // If =false, store credentials securely in httpOnly cookies
      // This prevents credentials from being visible in browser network tab
      if (!envDriven) {
        await storeCredentialsCookie({
          baseUrl,
          apiKey,
          agentId,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Configuration validated successfully',
      });
    }

    // if auth flow is disabled
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': ejentoAccessToken,
      'Ocp-Apim-Subscription-Key': apiKey,
    };
    
    console.log(`[${requestId}] Request headers prepared:`, {
      contentType: headers['Content-Type'],
      authorization: headers['Authorization'] ? 'present' : 'missing',
      ocpKey: headers['Ocp-Apim-Subscription-Key'] ? 'present' : 'missing',
    });

    // 1. Validate credentials by fetching current user
    let userData = null;

    try {
      const userUrl = `${baseUrl}/api/v2/users/me`;
      const userResponse = await axios.get(userUrl, {
        headers,
        timeout: 10000, // 10 second timeout
      });

      userData = userResponse.data;

      if (!userData || typeof userData === 'number') {
        return errorResponse(
          'Could not verify credentials. Please check your API key and access token.',
          401
        );
      }
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      console.log(`[${requestId}] Step 1 ERROR: Credential validation failed`);
      
      // Enhanced error logging
      if (axios.isAxiosError(error)) {
        console.log(`[${requestId}] Axios error details:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
          responseData: error.response?.data,
          responseHeaders: error.response?.headers,
          requestHeaders: error.config?.headers,
        });
      } else {
        console.log(`[${requestId}] Non-axios error:`, error);
      }
      
      let errorMessage = 'Failed to verify credentials';
      
      // Provide more detailed error messages
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = `Cannot connect to server. Please check that the server is reachable.`;
        console.log(`[${requestId}] Connection error: Unable to reach server at ${baseUrl}`);
      } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        errorMessage = `Request timed out while connecting to server. Please check your network connection.`;
        console.log(`[${requestId}] Timeout error: Request to ${baseUrl} timed out`);
      } else if (error.response) {
        // HTTP error response
        errorMessage = error.response.data?.message || error.response.data?.error || error.response.statusText || 'Failed to verify credentials';
        
        // Add specific guidance based on status code
        if (statusCode === 401) {
          errorMessage = 'Invalid credentials. Please verify your API key and access token are correct.';
          console.log(`[${requestId}] 401 Unauthorized: Invalid API key or access token`);
        } else if (statusCode === 403) {
          errorMessage = 'Access forbidden. Your credentials may not have permission to access this resource.';
          console.log(`[${requestId}] 403 Forbidden: Credentials lack required permissions`);
        } else if (statusCode === 404) {
          errorMessage = `API endpoint not found. Please verify server is reachable. Attempted: /api/v2/users/me`;
          console.log(`[${requestId}] 404 Not Found: Endpoint /api/v2/users/me does not exist at ${baseUrl}`);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return errorResponse(
        `Credential validation failed: ${errorMessage}`,
        statusCode
      );
    }

    // 2. Validate agent exists and is accessible
    try {
      await validateAgent(baseUrl, agentId, headers);
    } catch (error: any) {
      return errorResponse(
        `Agent validation failed: ${error.message}`,
        error.status || 500
      );
    }
    
    //after successful validation
    // If =false, store credentials securely in httpOnly cookies
    if (!envDriven) {
      await storeCredentialsCookie({
        baseUrl,
        apiKey,
        ejentoAccessToken,
        agentId,
      });
    }

    // if auth flow is disabled we return the user data at this point because it will be required by sidebar
    return NextResponse.json({
      success: true,
      message: 'Configuration validated successfully',
      userData: userData || null,
    });
  } catch (error) {
    console.error('Config validation error:', error);
    return errorResponse(
      'An unexpected error occurred during validation',
      500
    );
  }
}
