import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

/**
 * Validates agent using token from cookie (ejento_access_token)
 * This endpoint is specifically for /auth/userData page where we have the token in cookie
 * and want to validate the agent before proceeding
 */

export async function POST(request: Request) {
  let requestBody = null;
  let bodyConfig;
  try{
     requestBody = await request.json()
     bodyConfig = requestBody?.config;
  }
  catch(error){
    console.error(error)
  }
  try {
    const cookieStore = await cookies();
    
    // Get token from cookie
    const tokenCookie = cookieStore.get('ejento_access_token');
    if (!tokenCookie?.value) {
      return NextResponse.json(
        {
          success: false,
          message: 'Access token not found. Please login again.',
        },
        { status: 401 }
      );
    }

    // Get credentials (baseUrl, apiKey, agentId) from environment or cookie
    const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';

    const normalize = (value?: unknown): string => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    let baseUrl = '';
    let apiKey = '';
    let agentId = '';

    if (bodyConfig) {
      baseUrl = normalize(bodyConfig.baseUrl);
      apiKey = normalize(bodyConfig.apiKey);
      agentId = normalize(bodyConfig.agentId);
    }

    if ((!baseUrl || !apiKey || !agentId) && envDriven) {
      baseUrl = normalize(process.env.EJENTO_BASE_URL);
      apiKey = normalize(process.env.EJENTO_API_KEY);
      agentId = normalize(process.env.EJENTO_AGENT_ID);
    }

    if (!baseUrl || !apiKey || !agentId) {
      const credentialsCookie = cookieStore.get('ejento_api_credentials');

      if (!credentialsCookie?.value) {
        return NextResponse.json(
          { success: false, message: 'API credentials not configured.' },
          { status: 400 }
        );
      }

      try {
        const credentials = JSON.parse(credentialsCookie.value);

        baseUrl = normalize(credentials.baseUrl);
        apiKey = normalize(credentials.apiKey);
        agentId = normalize(credentials.agentId);
      } catch (error) {
        console.error(error);
        return NextResponse.json(
          { success: false, message: 'Invalid credentials configuration.' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!baseUrl || !apiKey || !agentId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required configuration values.',
        },
        { status: 400 }
      );
    }

    // Validate agent using token from cookie
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
      'Authorization': `Bearer ${tokenCookie.value}`,
    };

    try {
      const agentUrl = `${baseUrl}/api/v2/agents/${agentId}`;
      const agentResponse = await axios.get(agentUrl, { headers });
      const agentData = agentResponse.data;

      if (!(agentData?.success && agentData?.data)) {
        const errorMessage = agentData?.message ?? 'Agent could not be retrieved';
        return NextResponse.json(
          {
            success: false,
            message: `Invalid agent ID: ${errorMessage}`,
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Agent validated successfully',
        agentData: agentData.data,
      });
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || 'Failed to retrieve agent';

      return NextResponse.json(
        {
          success: false,
          message: `Agent validation failed: ${errorMessage}`,
        },
        { status: statusCode }
      );
    }
  } catch (error: any) {
    console.error('Agent validation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred during agent validation',
      },
      { status: 500 }
    );
  }
}

