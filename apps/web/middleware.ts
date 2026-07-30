import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === '/login') {
    if (accessToken) {
      const rootUrl = new URL('/', request.url);
      return NextResponse.redirect(rootUrl);
    }
  }

  return NextResponse.next();
}

// Scoped to run on dashboard and login pages
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
