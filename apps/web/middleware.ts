import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  // The auth cookie belongs to the Render origin, so Netlify middleware cannot
  // inspect it. Protected data remains enforced by the authenticated API.
  return NextResponse.next();
}

// Scoped to run on dashboard and login pages
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
