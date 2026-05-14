import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Routes that are always public (no authentication required)
const publicRoutes = [
  '/',           // Landing page
  '/login',      // Login page
  '/pay',        // Public payment pages
  '/api/auth',   // NextAuth endpoints
  '/api/pay',    // Payment API (record transactions, fetch payment links)
  '/api/sera',   // Sera FX (markets/quote/execute) used by the public payer flow
  '/api/wallet/tokens', // Public RPC pass-through for payer balances on /pay/[id]
  '/api/webhooks', // Webhook endpoints
  '/api/onboarding', // Onboarding API
  '/api/public', // Any public APIs
];

// Static assets and Next.js internals are handled by the matcher config below

// Rate-limited routes: auth endpoints (login brute-force) and team invite (email enumeration)
const rateLimitedRoutes: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: '/api/auth', limit: 20, windowMs: 60_000 },          // 20 req/min for auth
  { prefix: '/api/team', limit: 10, windowMs: 60_000 },          // 10 req/min for team ops
  { prefix: '/api/auth/challenge', limit: 30, windowMs: 60_000 }, // 30 challenges/min
];

// Routes exempt from CSRF header check (public APIs, auth callbacks, webhooks)
const csrfExemptRoutes = [
  '/api/auth',      // NextAuth endpoints (handles its own CSRF)
  '/api/pay',       // Public payment API
  '/api/webhooks',  // External webhook callbacks
  '/api/public',    // Public APIs
  '/api/onboarding', // Onboarding API
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── VDX-AUTH-010: Rate limiting for sensitive endpoints ──
  const clientIp = getClientIp(request.headers);
  for (const route of rateLimitedRoutes) {
    if (pathname.startsWith(route.prefix)) {
      const result = rateLimit(`${clientIp}:${route.prefix}`, route.limit, route.windowMs);
      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
            },
          },
        );
      }
      break; // matched most specific route
    }
  }

  // ── CSRF protection for state-changing API requests (VDX-AUTH-005) ──
  // Accept any one of the following as proof the request is same-origin:
  //   1. `x-requested-with` custom header (explicit opt-in by app code).
  //   2. `Sec-Fetch-Site: same-origin|none` (set by the browser; cannot be
  //      forged from a cross-origin context).
  //   3. `Origin` header matching the request host.
  // Cross-origin browser form POSTs and `<img>`/`<form>` GETs satisfy none of
  // these, so CSRF attacks are still blocked.
  const method = request.method;
  if (
    pathname.startsWith('/api/') &&
    method !== 'GET' &&
    method !== 'HEAD' &&
    method !== 'OPTIONS' &&
    !csrfExemptRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    const hasCustomHeader = request.headers.has('x-requested-with');
    const fetchSite = request.headers.get('sec-fetch-site');
    const isSameSite = fetchSite === 'same-origin' || fetchSite === 'none';
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const originMatchesHost =
      !!origin && !!host && (() => {
        try {
          return new URL(origin).host === host;
        } catch {
          return false;
        }
      })();

    if (!hasCustomHeader && !isSameSite && !originMatchesHost) {
      return NextResponse.json(
        { error: 'Forbidden — missing CSRF header' },
        { status: 403 },
      );
    }
  }

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // All other routes require authentication
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
