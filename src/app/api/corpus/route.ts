import { NextResponse, NextRequest } from "next/server";
import axios from 'axios'
 
const INDEXING_SERVICE_URL = process.env.FAST_API_INDEXING_BASE_URL;
const INDEXING_SERVICE_HEADER = process.env.INDEXING_SERVICE_HEADER;
const INDEXING_SERVICE_KEY = process.env.INDEXING_SERVICE_KEY;
const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';
 
async function getAuthToken(req: NextRequest): Promise<string | null> {
  
  let token: string | null = null;
  let source = '';

  if (process.env.NEXT_PUBLIC_AUTH_FLOW === "true") {
    token = req.cookies.get("ejento_access_token")?.value || null;
    source = 'cookie (ejento_access_token)';
  } else if (envDriven) {
    token = process.env.EJENTO_ACCESS_TOKEN || null;
    source = 'environment variable';
  } else {
    const cookieCredentials = req.cookies.get("ejento_api_credentials")?.value;
    
    if (cookieCredentials) {
      try {
        const parsedCredentials = JSON.parse(cookieCredentials);
        token = parsedCredentials.ejentoAccessToken || null;
        source = 'cookie credentials (parsed)';
      } catch (error) {
        console.error('Failed to parse cookie credentials:', error);
      }
    }
  }

  if (!token) {
    return null;
  }

  // Enhanced: Check if token already has Bearer prefix
  const hasBearerPrefix = token.startsWith('Bearer ');
  
  if (hasBearerPrefix) {
    return token;
  } else {
    return `Bearer ${token}`;
  }
}
 
// Helper function to get headers with auth
async function getHeaders(req: NextRequest): Promise<Record<string, string>> {
  const token = await getAuthToken(req);
 
  if (!token) {
    throw new Error('Authentication required');
  }
 
  if (!INDEXING_SERVICE_HEADER || !INDEXING_SERVICE_KEY) {
    throw new Error('Indexing service env variables are missing');
  }
 
  return {
    'Authorization': token,
    [INDEXING_SERVICE_HEADER]: INDEXING_SERVICE_KEY
  };
}
 
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
 
  if (!id) {
    return NextResponse.json(
      { error: 'Missing corpus ID' },
      { status: 400 }
    );
  }
 
  try {
    const headers = await getHeaders(req);
   
    const formData = await req.formData();
    const source = formData.get('source');
   
    if (source instanceof Blob) {
      const filename = (source as any).name || 'file';
      formData.append('source', source, filename);
    } else {
      formData.append('source', source?.toString() || '');
    }
 
    const url = `${INDEXING_SERVICE_URL}/api/v2/corpora/${id}/documents`;
    const response = await axios.post(url, formData, { headers });
   
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error details:', error);
 
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
 
    if (error.message === 'Indexing service env variables are missing') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
 
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
 
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to create document in corpus',
        data: [],
        details: error.response?.data || {}
      },
      { status: error.response?.status || 500 }
    );
  }
}
 
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const corpusId = searchParams.get('id');
 
  if (!corpusId) {
    return NextResponse.json(
      { error: 'Missing corpus ID' },
      { status: 400 }
    );
  }
 
  try {
    const headers = await getHeaders(req);
   
    const body = await req.json();
    const document_ids  = body;
 
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'document_ids array is required and must not be empty'
        },
        { status: 400 }
      );
    }
 
    headers['Content-Type'] = 'application/json';
 
    const url = `${INDEXING_SERVICE_URL}/api/v2/corpora/${corpusId}/documents`;
   
    const response = await axios.delete(url, {
      headers,
      data: document_ids
    });
 
    return NextResponse.json({
      success: true,
      message: 'Documents deleted successfully',
      data: response.data
    });
 
  } catch (error: any) {
    console.error('Error deleting documents:', error);
 
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
 
    if (error.message === 'Indexing service env variables are missing') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
 
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
 
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to delete documents from corpus',
        details: error.response?.data || {}
      },
      { status: error.response?.status || 500 }
    );
  }
}
 