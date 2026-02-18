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

    try {
      const credentials = JSON.parse(credentialsCookie.value);
      return NextResponse.json({
        success: true,
        data: credentials
      });
    } catch (parseError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials format' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error reading credentials from cookies:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to read credentials' 
    }, { status: 500 });
  }
}