import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const credentialsCookie = cookieStore.get('ejento_api_credentials');
    
    if (!credentialsCookie?.value) {
      return NextResponse.json({ 
        success: false, 
        message: 'No credentials found' 
      }, { status: 404 });
    }

    let credentials: Record<string, any>;
    try {
      credentials = JSON.parse(credentialsCookie.value);
    } catch (parseError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials format' 
      }, { status: 500 });
    }

    // Determine if authentication flow is enabled
    const isAuthFlowEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';

    // Validate fields based on auth flow
    const isValid = isAuthFlowEnabled
      ? !!(credentials.agentId && credentials.apiKey && credentials.baseUrl)
      : !!(credentials.agentId && credentials.apiKey && credentials.baseUrl && credentials.ejentoAccessToken);

    if (!isValid) {
      return NextResponse.json({
        success: false,
        message: 'Incomplete credentials in cookie'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: credentials
    });

  } catch (error) {
    console.error('Error reading credentials from cookies:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to read credentials' 
    }, { status: 500 });
  }
}
