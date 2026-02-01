import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const url_access_token = url.searchParams.get('token');
  const url_ejento_access_token = url.searchParams.get('ejento_access_token');
  const x = url.searchParams.get('x');

  const {
    NEXT_PUBLIC_AGENT,
    NEXT_PUBLIC_ENV_DRIVEN,
    NEXT_PUBLIC_AUTH_FLOW,
  } = process.env;

  const isAuthFlowEnabled = NEXT_PUBLIC_AUTH_FLOW === 'true';

  const authPages = ['/auth/login'];
  const publicPaths = ['/', '/settings', '/auth/confirmation'];

  const isAuthPage = authPages.includes(pathname);
  const isPublicPath = publicPaths.includes(pathname);

  function isValidToken(token?: string) {
    return (
      typeof token === 'string' &&
      token.trim() !== '' &&
      token !== 'undefined' &&
      token !== 'null'
    );
  }

  /* ---------------- ENV-DRIVEN RESTRICTION ---------------- */

  if (NEXT_PUBLIC_AGENT === 'true' && NEXT_PUBLIC_ENV_DRIVEN === 'false' && pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  /* ---------------- MAGIC LINK FLOW ---------------- */

  if (url_access_token && url_ejento_access_token && x) {
    const res = NextResponse.redirect(new URL('/auth/confirmation', req.url));

    res.cookies.set('token', url_access_token, { path: '/', maxAge: 7 * 86400, secure: true, sameSite: 'none' });
    res.cookies.set('ejento_access_token', url_ejento_access_token, { path: '/', maxAge: 7 * 86400, secure: true, sameSite: 'none' });
    res.cookies.set('magic_x', x, { path: '/', maxAge: 300, secure: true, sameSite: 'none' });

    return res;
  }

  if (url_access_token && url_ejento_access_token) {
    const res = NextResponse.redirect(new URL('/auth/userData', req.url));

    res.cookies.set('token', url_access_token, { path: '/', maxAge: 7 * 86400, secure: true, sameSite: 'none' });
    res.cookies.set('ejento_access_token', url_ejento_access_token, { path: '/', maxAge: 7 * 86400, secure: true, sameSite: 'none' });

    return res;
  }

  /* ---------------- COOKIE AUTH STATE ---------------- */

  const accessToken = req.cookies.get('token')?.value;
  const ejentoToken = req.cookies.get('ejento_access_token')?.value;

  const isAuthenticated =
    isValidToken(accessToken) && isValidToken(ejentoToken);

  const magicX = req.cookies.get('magic_x')?.value;

  /* ---------------- HARD BLOCKS ---------------- */

  // Prevent direct access to confirmation without magic token
  if (pathname === '/auth/confirmation' && !magicX) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Auth disabled → block auth pages
  if (!isAuthFlowEnabled && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  /* ---------------- AUTH FLOW ENABLED ---------------- */

  if (isAuthFlowEnabled) {
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
