import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserConfig } from '@/app/context/ConfigContext';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

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
 
async function validateAgent(
  baseUrl: string,
  agentId: string,
  headers: Record<string, string>
) {
  const agentUrl = `${baseUrl}/api/v2/agents/${agentId}`;
  const agentResponse = await axios.get(agentUrl, { headers });
  const agentData = agentResponse.data;

  console.log('[validate] GET /api/v2/agents raw response:', JSON.stringify(agentData, null, 2));

  if (!agentData || !agentData.success || !agentData.data) {
    throw {
      status: 404,
      message: agentData?.message || 'Agent could not be retrieved',
    };
  }

  return agentData;
}
 
async function storeCredentialsCookie(payload: Record<string, string>) {

  const cookieStore = await cookies();
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge?: number; // Make maxAge optional
  } = {
    httpOnly: true, // Prevents JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',
    path: '/',
  };

  // Only add maxAge if auth is disabled (7 days expiry)
  if (!isAuthEnabled) {
    cookieOptions.maxAge = 60 * 60 * 24 * 7; // 7 days
  }

  cookieStore.set('ejento_api_credentials', JSON.stringify(payload), cookieOptions);
}


export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7); // Generate unique ID for this request
  
  try {
    const body = await request.json();
    
    const config: UserConfig = body.config;
    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
    const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';
 
    let baseUrl: string;
    let apiKey: string;
    let ejentoAccessToken: string;
    let agentId: string;
 
    if (envDriven) {
      // For environment-driven config, read credentials from server-side environment variables
      
      baseUrl = process.env.EJENTO_BASE_URL?.trim() || '';
      apiKey = process.env.EJENTO_API_KEY?.trim() || '';
      ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN?.trim() || '';
      agentId = process.env.EJENTO_AGENT_ID?.trim() || '';
      
    } else {
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
    if (isAuthEnabled) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      };

      let agentInfo: any = null;
      try {
        agentInfo = await validateAgent(baseUrl, agentId, headers);
      } catch (error: any) {
        return errorResponse(
          `Agent validation failed: ${error.message}`,
          error.status || 500
        );
      }

      // Store credentials in httpOnly cookie
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
        agentPattern: agentInfo?.data?.pattern ?? null,
        reactEnabled: agentInfo?.data?.react_enabled ?? false,
      });
    }
 
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: ejentoAccessToken,
      'Ocp-Apim-Subscription-Key': apiKey,
    };
 
    let userData = null;
    try {
      const userUrl = `${baseUrl}/api/v2/users/me`;
      const userResponse = await axios.get(userUrl, {
        headers,
        timeout: 20000, // 20 second timeout
      });

      userData = userResponse.data;
     
      if (!userData || typeof userData === 'number') {
        console.error('Invalid user data response');
        return errorResponse(
          'Could not verify credentials. Please check your API key and access token.',
          401
        );
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

      return errorResponse(
        `User validation failed: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
 
    let agentInfo: any = null;
    try {
      agentInfo = await validateAgent(baseUrl, agentId, headers);
    } catch (error: any) {
      console.error('Agent validation failed:', error);
      return errorResponse(
        `Agent validation failed: ${error.message}`,
        error.status || 500
      );
    }
 
    // Store credentials in httpOnly cookie
    if (!envDriven) {
      await storeCredentialsCookie({
        baseUrl,
        apiKey,
        ejentoAccessToken,
        agentId,
      });
    }
 
    // Store config in database
    const userId = userData?.data?.id || userData?.id;
    if (userId) {
      try {
        await prisma.ejentoConfig.upsert({
          where: { userId },
          update: {
            baseUrl,
            apiKey,
            ejentoAccessToken: ejentoAccessToken || null,
            agentId: parseInt(agentId, 10)
          },
          create: {
            userId,
            baseUrl,
            apiKey,
            ejentoAccessToken: ejentoAccessToken || null,
            agentId: parseInt(agentId, 10)
          },
        });
      } catch (dbError) {
        return errorResponse(
          `Configuration validated but failed to save in database.`,
          500
        );
      }
    }
 
    return NextResponse.json({
      success: true,
      message: 'Configuration validated successfully',
      userData: userData || null,
      agentPattern: agentInfo?.data?.pattern ?? null,
      reactEnabled: agentInfo?.data?.react_enabled ?? false,
    });
  } catch (error) {
    return errorResponse(
      `An unexpected error occurred during validation`,
      500
    );
  } 
}
 