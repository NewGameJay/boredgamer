import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const { pathname, origin } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/sign-in', '/sign-up'];
  
  // Protected routes that require authentication
  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isPublicRoute = publicRoutes.includes(pathname);

  // If trying to access protected route without auth, redirect to sign in
  if (isProtectedRoute && !authCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // If trying to access auth pages while authenticated, redirect to dashboard
  if (isPublicRoute && authCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Referral redirect logic
  const match = pathname.match(/^\/([^\/]+)\/([^\/]+)/);
  if (match && !isProtectedRoute && !isPublicRoute) {
    const referralGame = match[1];
    const referralSlug = match[2];
    // Call our new API route to resolve the destination
    try {
      const apiUrl = `${origin}/api/resolve-referral?referralGame=${referralGame}&referralSlug=${referralSlug}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.referralDestination) {
          return NextResponse.redirect(data.referralDestination, 302);
        }
      }
    } catch (e) {
      // Fail silently and fall through to normal routing
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sign-in',
    '/sign-up',
    '/:game/:referralSlug',
  ],
};
