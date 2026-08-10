import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';

/**
 * Routes that render for anyone, signed in or not. Everything else is
 * protected by default: a request for any other path with no Supabase
 * session is redirected to /login. This "default protected" model means
 * new routes are safe-by-default even before anyone remembers to add them
 * to an allowlist.
 */
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/auth/callback',
  '/cach-hoat-dong',
  '/nguyen-tac-cong-dong',
  '/an-toan',
  '/dieu-khoan',
  '/quyen-rieng-tu',
  '/tro-giup',
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Refreshes the Supabase session cookie on every request and performs an
 * optimistic (cookie-only) auth check: unauthenticated visitors are
 * redirected away from anything not explicitly public, and authenticated
 * visitors are bounced off /login. Proxy intentionally does *not* check
 * phone-verification or profile-completion here — those require a call to
 * our own API and are enforced by the (app) and (onboarding) route
 * segments themselves, close to the data they depend on.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  if (!url || !anonKey) {
    // Supabase isn't configured in this environment. Fail closed on
    // protected routes without ever calling out to Supabase (so public
    // pages, including local dev/test without live credentials, still
    // render), and fail open on public routes.
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/trang-chu', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|ico|webmanifest)$).*)',
  ],
};
