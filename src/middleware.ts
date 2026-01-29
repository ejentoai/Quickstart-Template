import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const url_access_token = url.searchParams.get('token');
  const url_ejento_access_token = url.searchParams.get('ejento_access_token');
  const x = url.searchParams.get('x');
  console.log(pathname,'pathnamemiddleware')

  function isValidToken(token?: string) {
    return (
      typeof token === 'string' &&
      token.trim() !== '' &&
      token !== 'undefined' &&
      token !== 'null'
    );
  }

  if (url_access_token && url_ejento_access_token && x) {

    //for magic link validation
    const cleanUrl = new URL('/auth/confirmation', req.url);
    const res = NextResponse.redirect(cleanUrl);

    res.cookies.set('token', url_access_token, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      secure: true,
      sameSite: 'none',
      httpOnly: false,
    });

    res.cookies.set('ejento_access_token', url_ejento_access_token, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      secure: true,
      sameSite: 'none',
      httpOnly: false,
    });

    return res; 
  }

  if (url_access_token && url_ejento_access_token) {
    
    //after getting tokens fetch user data
    const cleanUrl = new URL('/auth/userData', req.url);
    const res = NextResponse.redirect(cleanUrl);

    res.cookies.set('token', url_access_token, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      secure: true,
      sameSite: 'none',
      httpOnly: false,
    });

    res.cookies.set('ejento_access_token', url_ejento_access_token, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      secure: true,
      sameSite: 'none',
      httpOnly: false,
    });

    return res; 
  }

  const authPages = [
    '/auth/login',
    '/auth/verify-otp',
    '/auth/verification',
  ];
  
  const isAuthFlowEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';

  const publicPaths = ['/', '/settings','/auth/userData'];

  const isAuthPage = authPages.includes(pathname);
  const isPublicPath = publicPaths.includes(pathname);

  const access_token_raw = req.cookies.get('token')?.value;
  const ejento_token_raw = req.cookies.get('ejento_access_token')?.value;

  const access_token = isValidToken(access_token_raw);
  const ejento_access_token = isValidToken(ejento_token_raw);

  const isAuthenticated = access_token && ejento_access_token;

  if (!isAuthFlowEnabled && isAuthPage) {

    return NextResponse.redirect(new URL('/', req.url));
  }
  
  if(process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'){
    if (!isAuthenticated && !isAuthPage && !isPublicPath) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  
    if (isAuthenticated && isAuthPage) {

      return NextResponse.redirect(new URL('/chat', req.url));
    }  
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/settings', '/chat/:path*', '/auth/:path*'],
};
