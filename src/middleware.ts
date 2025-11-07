import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
    const { pathname, origin } = req.nextUrl;
    
    const containsMaliciousQuery = (request: NextRequest): boolean => {
        const queryParams = request.nextUrl.searchParams;
    
        for (const [_, value] of queryParams.entries()) {
          // Check for <script> tags
          if (/<script[\s\S]*?>[\s\S]*?<\/script>/i.test(value)) {
            return true;
          }
    
          // Check for generic HTML tags
          if (/<\/?[a-z][\s\S]*?>/i.test(value)) {
            return true;
          }
    
          // Check for SQL keywords
          if (
            /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|UNION|WHERE|LIKE|HAVING|EXEC|EXECUTE|--|#)\b/i.test(
              value
            )
          ) {
            return true;
          }
        }
    
        return false;
      };
    
      if (containsMaliciousQuery(req)) {
        return new NextResponse("Page Not Found", { status: 404 });
      }

    // Root route - let page.tsx handle configuration-based routing
    if (pathname === "/") {
        return NextResponse.next();
    }

    // Settings route - always allow access
    if (pathname === "/settings") {
        return NextResponse.next();
    }

    // Chat route - let the app handle configuration checking via ConfigGuard
    if (pathname === "/chat") {
        return NextResponse.next();
    }

    // Block access to old login routes and redirect to settings
    if (pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/settings', origin));
    }

    // Default: Allow other routes to proceed
    return NextResponse.next();
}