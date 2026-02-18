import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserConfig } from '@/app/context/ConfigContext';
import axios from 'axios';

// Debug logger with timestamps
const debug = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] 🔍 DEBUG: ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] 🔍 DEBUG: ${message}`);
  }
};

const errorDebug = (message: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ERROR: ${message}`);
  if (error) {
    console.error(`[${timestamp}] 📋 Error details:`, {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      }
    });
  }
};

function errorResponse(message: string, status = 400) {
  debug(`Returning error response: ${message} (${status})`);
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
  const parsed = {
    status: error.response?.status || 500,
    message:
      error.response?.data?.message ||
      error.response?.data?.error ||
      fallback,
  };
  debug(`Parsed axios error:`, parsed);
  return parsed;
}

async function validateAgent(
  baseUrl: string,
  agentId: string,
  headers: Record<string, string>
) {
  const agentUrl = `${baseUrl}/api/v2/agents/${agentId}`;
  debug(`Validating agent at URL: ${agentUrl}`);
  debug(`Agent validation headers:`, { 
    ...headers, 
    Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined,
    'Ocp-Apim-Subscription-Key': '[REDACTED]'
  });
  
  try {
    const agentResponse = await axios.get(agentUrl, { headers, timeout: 10000 });
    debug(`Agent validation response status: ${agentResponse.status}`);
    debug(`Agent validation response data:`, agentResponse.data);
    
    const agentData = agentResponse.data;

    if (!agentData || !agentData.success || !agentData.data) {
      debug(`Agent validation failed - invalid response structure:`, agentData);
      throw {
        status: 404,
        message: agentData?.message || 'Agent could not be retrieved',
      };
    }

    debug(`Agent validation successful for agent: ${agentId}`);
    return agentData;
  } catch (error: any) {
    errorDebug(`Agent validation failed for URL ${agentUrl}`, error);
    throw {
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'Agent could not be retrieved',
    };
  }
}

async function storeCredentialsCookie(payload: Record<string, string>) {
  debug(`Storing credentials in httpOnly cookie`);
  const cookieStore = await cookies();

  cookieStore.set(
    'ejento_api_credentials',
    JSON.stringify(payload),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }
  );
  debug(`Credentials cookie set successfully`);
}

export async function POST(request: Request) {
  debug(`========== CONFIG VALIDATION STARTED ==========`);
  
  try {
    // Log environment variables (without exposing full values)
    debug(`Environment check:`, {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_AUTH_FLOW: process.env.NEXT_PUBLIC_AUTH_FLOW,
      NEXT_PUBLIC_ENV_DRIVEN: process.env.NEXT_PUBLIC_ENV_DRIVEN,
      EJENTO_BASE_URL: process.env.EJENTO_BASE_URL ? '[PRESENT]' : '[MISSING]',
      EJENTO_API_KEY: process.env.EJENTO_API_KEY ? '[PRESENT]' : '[MISSING]',
      EJENTO_ACCESS_TOKEN: process.env.EJENTO_ACCESS_TOKEN ? '[PRESENT]' : '[MISSING]',
      EJENTO_AGENT_ID: process.env.EJENTO_AGENT_ID ? '[PRESENT]' : '[MISSING]',
    });

    // Parse request body
    let body;
    try {
      body = await request.json();
      debug(`Request body received:`, {
        hasConfig: !!body.config,
        configKeys: body.config ? Object.keys(body.config) : [],
      });
    } catch (parseError) {
      errorDebug(`Failed to parse request body`, parseError);
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    const config: UserConfig = body.config;
    
    if (!config) {
      debug(`No config object in request body`);
      return errorResponse('Missing config object in request body', 400);
    }

    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
    debug(`Auth flow enabled: ${isAuthEnabled}`);

    const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';
    debug(`Environment driven config: ${envDriven}`);

    let baseUrl: string;
    let apiKey: string;
    let ejentoAccessToken: string;
    let agentId: string;

    if (envDriven) {
      debug(`Using environment variables for config`);
      baseUrl = process.env.EJENTO_BASE_URL?.trim() || '';
      apiKey = process.env.EJENTO_API_KEY?.trim() || '';
      ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN?.trim() || '';
      agentId = process.env.EJENTO_AGENT_ID?.trim() || '';
      
      debug(`Environment values loaded:`, {
        baseUrl: baseUrl ? '[PRESENT]' : '[MISSING]',
        apiKey: apiKey ? '[PRESENT]' : '[MISSING]',
        ejentoAccessToken: ejentoAccessToken ? '[PRESENT]' : '[MISSING]',
        agentId: agentId ? '[PRESENT]' : '[MISSING]',
      });
    } else {
      debug(`Using request body for config`);
      baseUrl = config?.baseUrl?.trim() || '';
      apiKey = config?.apiKey?.trim() || '';
      ejentoAccessToken = config?.ejentoAccessToken?.trim() || '';
      agentId = config?.agentId?.trim() || '';
      
      debug(`Request values:`, {
        baseUrl: baseUrl ? '[PRESENT]' : '[MISSING]',
        apiKey: apiKey ? '[PRESENT]' : '[MISSING]',
        ejentoAccessToken: ejentoAccessToken ? '[PRESENT]' : '[MISSING]',
        agentId: agentId ? '[PRESENT]' : '[MISSING]',
      });
    }

    // Check for missing config
    const hasMissingConfig = !baseUrl || !apiKey || !agentId || (!isAuthEnabled && !ejentoAccessToken);
    
    if (hasMissingConfig) {
      debug(`Missing required configuration:`, {
        baseUrl: !!baseUrl,
        apiKey: !!apiKey,
        agentId: !!agentId,
        ejentoAccessToken: !isAuthEnabled ? !!ejentoAccessToken : 'not required',
      });
      
      return errorResponse(
        envDriven
          ? 'Missing required environment variables.'
          : 'Missing required configuration values.',
        400
      );
    }

    debug(`All required config present, proceeding with validation`);

    if (isAuthEnabled) {
      debug(`=== AUTH ENABLED FLOW ===`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      };

      debug(`Validating agent with API key only`);
      
      try {
        await validateAgent(baseUrl, agentId, headers);
        debug(`Agent validation successful for auth flow`);
      } catch (error: any) {
        errorDebug(`Agent validation failed in auth flow`, error);
        return errorResponse(
          `Agent validation failed: ${error.message}`,
          error.status || 500
        );
      }
     
      if (!envDriven) {
        try {
          await storeCredentialsCookie({
            baseUrl,
            apiKey,
            agentId,
          });
          debug(`Credentials stored in cookie for auth flow`);
        } catch (cookieError) {
          errorDebug(`Failed to store credentials in cookie`, cookieError);
          // Continue even if cookie storage fails - validation still succeeded
        }
      }

      debug(`Auth flow validation completed successfully`);
      debug(`========== CONFIG VALIDATION COMPLETED ==========`);
      
      return NextResponse.json({
        success: true,
        message: 'Configuration validated successfully',
      });
    }

    // Auth disabled flow
    debug(`=== AUTH DISABLED FLOW ===`);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': ejentoAccessToken,
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    // 1. Validate credentials by fetching current user
    let userData = null;
    debug(`Fetching user data from: ${baseUrl}/api/v2/users/me`);

    try {
      const userUrl = `${baseUrl}/api/v2/users/me`;
      debug(`Making request to: ${userUrl}`);
      
      const userResponse = await axios.get(userUrl, {
        headers,
        timeout: 10000,
      });

      debug(`User data response status: ${userResponse.status}`);
      debug(`User data response headers:`, userResponse.headers);
      debug(`User data response:`, userResponse.data);

      userData = userResponse.data;

      if (!userData) {
        debug(`User data is empty or null`);
        return errorResponse('Could not verify credentials. Empty response from server.', 401);
      }

      if (typeof userData === 'number') {
        debug(`User data is a number: ${userData}`);
        return errorResponse('Could not verify credentials. Invalid response from server.', 401);
      }

      debug(`User data validation successful`);
    } catch (error: any) {
      errorDebug(`User data fetch failed`, error);
      
      const statusCode = error.response?.status || 500;
      let errorMessage = 'Failed to verify credentials';
     
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = `Cannot connect to server at ${baseUrl}. Please check that the server is reachable.`;
      } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        errorMessage = `Request timed out while connecting to server at ${baseUrl}. Please check your network connection.`;
      } else if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || error.response.statusText || 'Failed to verify credentials';
       
        if (statusCode === 401) {
          errorMessage = 'Invalid credentials. Please verify your API key and access token are correct.';
        } else if (statusCode === 403) {
          errorMessage = 'Access forbidden. Your credentials may not have permission to access this resource.';
        } else if (statusCode === 404) {
          errorMessage = `API endpoint not found at ${baseUrl}/api/v2/users/me. Please verify the base URL is correct.`;
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
    debug(`Validating agent for auth disabled flow`);
    try {
      await validateAgent(baseUrl, agentId, headers);
      debug(`Agent validation successful for auth disabled flow`);
    } catch (error: any) {
      errorDebug(`Agent validation failed in auth disabled flow`, error);
      return errorResponse(
        `Agent validation failed: ${error.message}`,
        error.status || 500
      );
    }
   
    if (!envDriven) {
      try {
        await storeCredentialsCookie({
          baseUrl,
          apiKey,
          ejentoAccessToken,
          agentId,
        });
        debug(`Credentials stored in cookie for auth disabled flow`);
      } catch (cookieError) {
        errorDebug(`Failed to store credentials in cookie`, cookieError);
        // Continue even if cookie storage fails
      }
    }

    debug(`Auth disabled flow validation completed successfully`);
    debug(`========== CONFIG VALIDATION COMPLETED ==========`);
    
    return NextResponse.json({
      success: true,
      message: 'Configuration validated successfully',
      userData: userData || null,
    });
    
  } catch (error) {
    errorDebug(`Unhandled error in validation endpoint`, error);
    return errorResponse(
      'An unexpected error occurred during validation',
      500
    );
  }
}