import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getServerSideCredentials() {
  const envDriven =
    process.env.ENV_DRIVEN === 'true' || process.env.ENV_DRIVEN === '1';

  const cookieStore = await cookies();

  let baseUrl: string | undefined;

  if (envDriven) {
    baseUrl = process.env.EJENTO_BASE_URL;
  } else {
    const credentialsCookie = cookieStore.get('ejento_api_credentials');
    if (credentialsCookie?.value) {
      const creds = JSON.parse(credentialsCookie.value);
      baseUrl = creds.baseUrl;
    }
  }

  if (!baseUrl) return null;

  return { baseUrl };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const credentials = await getServerSideCredentials();

  if (!credentials) {
    return NextResponse.json(
      { error: 'Credentials not configured' },
      { status: 401 }
    );
  }

  const next = `${process.env.NEXT_PUBLIC_APP_URL}/auth/userData`;

  const redirectUrl = `${credentials.baseUrl}/auth-service/api/v2/sso/${provider}/login?next=${next}`;

  return NextResponse.json({
    success: true,
    redirectUrl,
  });
}