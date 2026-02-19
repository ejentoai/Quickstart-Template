import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserConfig } from '@/app/context/ConfigContext';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

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

async function storeCredentialsCookie(payload: Record<string, string>) {
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
}

export async function POST(request: Request) {
  
  try {
    // Try to get the raw request body first to debug
    const rawBody = await request.text();
    console.log('Raw request body length:', rawBody?.length || 0);
    console.log('Raw request body preview:', rawBody?.substring(0, 500));
    
    if (!rawBody || rawBody.trim() === '') {
      return errorResponse('Request body is empty', 400);
    }
    
    // Parse the JSON
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON PARSE ERROR:', parseError.message);
      console.error('Parse error stack:', parseError.stack);
      console.error('Raw body that failed:', rawBody);
      return errorResponse(`Invalid JSON format: ${parseError.message}`, 400);
    }
    
    const config: UserConfig = body.config;
    console.log('Config object received:', {
      hasBaseUrl: !!config?.baseUrl,
      hasApiKey: !!config?.apiKey,
      hasEjentoAccessToken: !!config?.ejentoAccessToken,
      hasAgentId: !!config?.agentId,
      baseUrlPreview: config?.baseUrl?.substring(0, 30),
      agentId: config?.agentId,
      configKeys: config ? Object.keys(config) : []
    });

    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
    const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';
    
    console.log('Environment flags:', {
      isAuthEnabled,
      envDriven,
      NODE_ENV: process.env.NODE_ENV
    });

    let baseUrl: string;
    let apiKey: string;
    let ejentoAccessToken: string;
    let agentId: string;

    if (envDriven) {
      console.log('Using environment variables for config');
      baseUrl = process.env.EJENTO_BASE_URL?.trim() || '';
      apiKey = process.env.EJENTO_API_KEY?.trim() || '';
      ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN?.trim() || '';
      agentId = process.env.EJENTO_AGENT_ID?.trim() || '';
      
      console.log('Env vars loaded:', {
        hasBaseUrl: !!baseUrl,
        hasApiKey: !!apiKey,
        hasAccessToken: !!ejentoAccessToken,
        hasAgentId: !!agentId,
        baseUrlPreview: baseUrl?.substring(0, 30),
        agentId
      });
    } else {
      console.log('Using request config for validation');
      baseUrl = config?.baseUrl?.trim() || '';
      apiKey = config?.apiKey?.trim() || '';
      ejentoAccessToken = config?.ejentoAccessToken?.trim() || '';
      agentId = config?.agentId?.trim() || '';
      
      console.log('Request config values:', {
        hasBaseUrl: !!baseUrl,
        hasApiKey: !!apiKey,
        hasAccessToken: !!ejentoAccessToken,
        hasAgentId: !!agentId,
        baseUrlPreview: baseUrl?.substring(0, 30),
        agentId
      });
    }

    const hasMissingConfig =
      !baseUrl ||
      !apiKey ||
      !agentId ||
      (!isAuthEnabled && !ejentoAccessToken);

    if (hasMissingConfig) {
      console.error('❌ Missing required config:', {
        missingBaseUrl: !baseUrl,
        missingApiKey: !apiKey,
        missingAgentId: !agentId,
        missingAccessToken: !isAuthEnabled && !ejentoAccessToken
      });
      
      return errorResponse(
        envDriven
          ? 'Missing required environment variables.'
          : 'Missing required configuration values.',
        400
      );
    }

    console.log('✅ All required config values present');

    // Validate credentials / agent
    if (isAuthEnabled) {
      console.log('Auth enabled - validating agent only');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      };

      try {
        console.log('Validating agent with URL:', `${baseUrl}/api/v2/agents/${agentId}`);
        const agentData = await validateAgent(baseUrl, agentId, headers);
        console.log('✅ Agent validation successful:', agentData);
      } catch (error: any) {
        console.error('❌ Agent validation failed:', error);
        return errorResponse(
          `Agent validation failed: ${error.message}`,
          error.status || 500
        );
      }

      // Store credentials in httpOnly cookie
      if (!envDriven) {
        console.log('Storing credentials in cookie');
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

    // Auth disabled – full validation including user fetch
    console.log('Auth disabled - performing full validation');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: ejentoAccessToken,
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    let userData = null;
    try {
      const userUrl = `${baseUrl}/api/v2/users/me`;
      console.log('Fetching user data from:', userUrl);
      const userResponse = await axios.get(userUrl, { headers, timeout: 10000 });
      userData = userResponse.data;
      console.log('User data received:', {
        hasData: !!userData,
        dataType: typeof userData,
        keys: userData ? Object.keys(userData) : []
      });

      if (!userData || typeof userData === 'number') {
        console.error('❌ Invalid user data response');
        return errorResponse(
          'Could not verify credentials. Please check your API key and access token.',
          401
        );
      }
    } catch (error: any) {
      console.error('❌ User fetch failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return errorResponse(
        `User validation failed: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }

    try {
      console.log('Validating agent with URL:', `${baseUrl}/api/v2/agents/${agentId}`);
      await validateAgent(baseUrl, agentId, headers);
      console.log('✅ Agent validation successful');
    } catch (error: any) {
      console.error('❌ Agent validation failed:', error);
      return errorResponse(
        `Agent validation failed: ${error.message}`,
        error.status || 500
      );
    }

    // Store credentials in httpOnly cookie
    if (!envDriven) {
      console.log('Storing credentials in cookie');
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
      console.log('Storing config in database for user:', userId);
      try {
        await prisma.ejentoConfig.upsert({
          where: { userId },
          update: {
            baseUrl,
            apiKey,
            accessToken: ejentoAccessToken || null,
            agentId: parseInt(agentId, 10)
          },
          create: {
            userId,
            baseUrl,
            apiKey,
            accessToken: ejentoAccessToken || null,
            agentId: parseInt(agentId, 10)
          },
        });
        console.log('✅ Database storage successful');
      } catch (dbError) {
        console.error('❌ Failed to save config to database:', dbError);
      }
    } else {
      console.log('No userId found, skipping database storage');
    }

    console.log('✅ Validation complete - returning success');
    return NextResponse.json({
      success: true,
      message: 'Configuration validated successfully',
      userData: userData || null,
    });
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR in validation endpoint:', error);
    console.error('Error stack:', error.stack);
    return errorResponse(
      `An unexpected error occurred during validation: ${error.message}`,
      500
    );
  } finally {
    console.log('=== CONFIG VALIDATION ENDPOINT FINISHED ===\n');
  }
}