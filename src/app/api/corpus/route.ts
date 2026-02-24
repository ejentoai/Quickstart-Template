import { NextResponse, NextRequest } from "next/server";
import axios from 'axios'

const INDEXING_SERVICE_URL = process.env.FAST_API_INDEXING_BASE_URL;
const INDEXING_SERVICE_HEADER = process.env.INDEXING_SERVICE_HEADER;
const INDEXING_SERVICE_KEY = process.env.INDEXING_SERVICE_KEY;
let ejentoAccessToken;
let cookieCredentials;

const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true';

export async function POST(req : NextRequest){
    
    const { searchParams} = new URL(req.url)
    const id  = searchParams.get('id')
    if(!id){
        return NextResponse.json(
            { error: 'Missing corpus ID' }, { status: 400 }
        )
    }
    if(envDriven){
        ejentoAccessToken = process.env.EJENTO_ACCESS_TOKEN;
    }
    else{
        cookieCredentials = req.cookies.get('ejento_api_credentials')?.value
        console.log(cookieCredentials,'cookieCredentials')
        const parsedCredentials = JSON.parse(cookieCredentials)
        console.log(parsedCredentials,'parse')
        ejentoAccessToken = parsedCredentials.ejentoAccessToken
    }
    if(!ejentoAccessToken){
        return NextResponse.json(
            { error: 'Authentication required' }, { status: 401 }
        )
    }
    let headers = {}
    headers['Authorization'] = `${ejentoAccessToken}`
    headers[INDEXING_SERVICE_HEADER] = INDEXING_SERVICE_KEY
    try{
      const formData = await req.formData()
      const source = formData.get('source')
      if( source instanceof Blob){
        const filename = (source as any).name || 'file'
        formData.append('source',source,filename)
      }
      else{
         formData.append('source',source?.toString())
      }
      const url = `${INDEXING_SERVICE_URL}/api/v2/corpora/${id}/documents`
      const response = await axios.post(url, formData, { headers })
      return NextResponse.json(response.data)
    }
    catch (error: any) {
        console.error('Error details:', error)
    
        if (error.response) {
          console.error('API Response:', error.response.data)
        }
    
        return NextResponse.json(
          {
            success: false,
            message: error?.message || 'Failed to create document in corpus',
            data: [],
            details: error.response?.data || {}
          },
          { status: error.response?.status || 500 }
        )
      }
}