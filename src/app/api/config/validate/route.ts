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

    const rawBody = await request.text();
    if (!rawBody || rawBody.trim() === '') {
      return errorResponse('Request body is empty', 400);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return errorResponse(`Invalid JSON format`, 400);
    }
    
    const config: UserConfig = body.config;
    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
    const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';

    let baseUrl: string;
    let apiKey: string;
    let ejentoAccessToken: string;
    let agentId: string;

    if (envDriven) {
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
      console.error('Missing required config:', {
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

    console.log('Auth disabled - performing full validation');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: ejentoAccessToken,
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    let userData = null;
    try {
      const userUrl = `${baseUrl}/api/v2/users/me`;
      const userResponse = await axios.get(userUrl, { headers, timeout: 10000 });
      userData = userResponse.data;
      
      if (!userData || typeof userData === 'number') {
        console.error('Invalid user data response');
        return errorResponse(
          'Could not verify credentials. Please check your API key and access token.',
          401
        );
      }
    } catch (error: any) {
      console.error('User fetch failed:', {
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
      await validateAgent(baseUrl, agentId, headers);
    } catch (error: any) {
      console.error('Agent validation failed:', error);
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
      }
    } else {
      console.log('No userId found, skipping database storage');
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration validated successfully',
      userData: userData || null,
    });
  } catch (error) {
    return errorResponse(
      `An unexpected error occurred during validation`,
      500
    );
  } finally {
    console.log('=== CONFIG VALIDATION ENDPOINT FINISHED ===\n');
  }
}