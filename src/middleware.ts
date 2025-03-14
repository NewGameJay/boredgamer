import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sign-in',
    '/sign-up',
  ],
};
