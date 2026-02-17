import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/getUserId';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // Get login token from cookie (required)
    const tokenCookie = cookieStore.get('ejento_access_token');
    if (!tokenCookie?.value) {
      return NextResponse.json(
        { success: false, message: 'Access token not found. Please login again.' },
        { status: 401 }
      );
    }

    // Check for pending config from localStorage (sent from client)
    const body = await request.json();
    const pendingConfig = body.pendingConfig;

    const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';
    
    let baseUrl: string;
    let apiKey: string;
    let agentId: string;

    // Determine credentials priority:
    // 1. Pending config from manual setup (auth-enabled flow)
    // 2. Environment variables (env-driven)
    // 3. Credentials cookie (fallback)
    if (pendingConfig?.baseUrl && pendingConfig?.apiKey && pendingConfig?.agentId) {
      baseUrl = pendingConfig.baseUrl.trim();
      apiKey = pendingConfig.apiKey.trim();
      agentId = pendingConfig.agentId.trim();
    } else if (envDriven) {
      baseUrl = process.env.EJENTO_BASE_URL?.trim() || '';
      apiKey = process.env.EJENTO_API_KEY?.trim() || '';
      agentId = process.env.EJENTO_AGENT_ID?.trim() || '';
    } else {
      const credentialsCookie = cookieStore.get('ejento_api_credentials');
      if (!credentialsCookie?.value) {
        return NextResponse.json(
          { success: false, message: 'API credentials not configured. Please go to settings first.' },
          { status: 400 }
        );
      }
      try {
        const credentials = JSON.parse(credentialsCookie.value);
        baseUrl = credentials.baseUrl?.trim() || '';
        apiKey = credentials.apiKey?.trim() || '';
        agentId = credentials.agentId?.trim() || '';
      } catch (error) {
        return NextResponse.json(
          { success: false, message: 'Invalid credentials configuration.' },
          { status: 400 }
        );
      }
    }

    if (!baseUrl || !apiKey || !agentId) {
      return NextResponse.json(
        { success: false, message: 'Missing required configuration values.' },
        { status: 400 }
      );
    }

    // Validate agent using the login token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
      'Authorization': `Bearer ${tokenCookie.value}`,
    };

    let agentData;
    try {
      const agentUrl = `${baseUrl}/api/v2/agents/${agentId}`;
      const agentResponse = await axios.get(agentUrl, { headers });
      agentData = agentResponse.data;

      if (!(agentData?.success && agentData?.data)) {
        const errorMessage = agentData?.message ?? 'Agent could not be retrieved';
        return NextResponse.json(
          { success: false, message: `Invalid agent ID: ${errorMessage}` },
          { status: 404 }
        );
      }
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || 'Failed to retrieve agent';
      return NextResponse.json(
        { success: false, message: `Agent validation failed: ${errorMessage}` },
        { status: statusCode }
      );
    }

    // Agent validation succeeded – now save config to database for the logged‑in user
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Convert agentId to number (assuming it's numeric)
    const agentIdNumber = parseInt(agentId, 10);
    if (isNaN(agentIdNumber)) {
      return NextResponse.json(
        { success: false, message: 'Invalid agent ID: must be a number' },
        { status: 400 }
      );
    }

    try {
      // First, ensure the user exists in the local database
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
        },
      });

      // Upsert the configuration using your existing endpoint logic
      // But we're doing it directly here to avoid another API call
      const savedConfig = await prisma.ejentoConfig.upsert({
        where: { userId },
        update: {
          baseUrl,
          apiKey,
          accessToken: tokenCookie.value,
          agentId: agentIdNumber,
        },
        create: {
          userId,
          baseUrl,
          apiKey,
          accessToken: tokenCookie.value,
          agentId: agentIdNumber,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Agent validated and configuration saved successfully',
        config: savedConfig,
      });
    } catch (dbError) {
      console.error('Database error while saving config:', dbError);
      return NextResponse.json(
        { success: false, message: 'Agent validated but failed to save configuration to database.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Agent validation error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred during agent validation' },
      { status: 500 }
    );
  }
}