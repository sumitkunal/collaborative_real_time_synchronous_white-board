import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    const isAuthRoute = pathname.startsWith('/signin') || pathname.startsWith('/signup');
    const isProtectedRoute = pathname.startsWith('/canvas') || pathname.startsWith('/dashboard');

    if (isAuthRoute) {
        if (token) {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    if (isProtectedRoute && !token) {
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = '/signin';
        signInUrl.searchParams.set('redirect', pathname + (search || ''));
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/canvas/:path*', '/signin', '/signup', '/dashboard']
};


