import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy — cookie-based route protection (Next.js 16 file convention).
 *
 * Phase 9.2: /auth/* is the Irno ID Hosted UI (public — no auth required).
 * /login is kept as a legacy redirect to /auth/login.
 *
 * Post-auth redirect priority (enforced here for already-logged-in users):
 *   1. valid returnTo (absolute URL, allowlisted) → cross-app redirect
 *   2. hub-internal `from` path (SSO routes, protected page redirects)
 *   3. app context default (app=career → career-web; app=meetino → SSO route)
 *   4. Hub default (/dashboard)
 *
 * For unauthenticated users reaching /sso/<appId>:
 *   → redirected to /auth/login?app=<appId>&from=<sso_path>
 *   so Irno ID Hosted UI can show app-aware branding.
 *
 * Note: Cookie presence check only — real JWT validation happens in
 * app layout via GET /api/v1/auth/me (401 → redirect to login).
 */

/** Routes that don't require authentication. */
// Phase 13: /verify/* added — public certificate verification pages
const PUBLIC_PREFIXES = ['/login', '/auth/', '/logout', '/verify/']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Allowed origins for cross-app returnTo redirects.
 * Only these origins are trusted as returnTo destinations.
 * Add production domains here as they are set up.
 */
const ALLOWED_RETURN_TO_ORIGINS = [
  process.env.NEXT_PUBLIC_CAREER_WEB_URL ?? 'http://localhost:3002',
  // Future: 'https://cv.irno.academy', 'https://career.irno.ir'
].filter(Boolean) as string[]

/**
 * Default Meetino SSO callback URL.
 * Used when an authenticated user lands on /auth/login?app=meetino without a `from` param.
 * Should match NEXT_PUBLIC_MEETINO_CALLBACK_URL in meetino-web env.
 */
const MEETINO_CALLBACK_URL =
  process.env.NEXT_PUBLIC_MEETINO_CALLBACK_URL ?? 'http://localhost:3001/auth/irno/callback'

/**
 * Validate a returnTo URL against the origin allowlist.
 * Returns the URL string if valid, null otherwise.
 * Prevents open redirect attacks.
 */
function validateReturnTo(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const allowed = ALLOWED_RETURN_TO_ORIGINS.some((origin) => {
      try { return url.origin === new URL(origin).origin } catch { return false }
    })
    return allowed ? raw : null
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('irno_at')?.value

  // ── Authenticated users on auth pages ───────────────────────────────────────
  // Priority: returnTo > app context > Hub default (/dashboard)
  // This handles: "already logged in ADMIN opening Career CTA login URL"
  const isAuthPage =
    pathname === '/login' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register')

  if (isAuthPage && accessToken) {
    // Priority 1: valid absolute returnTo (cross-app, allowlisted)
    const returnTo = request.nextUrl.searchParams.get('returnTo')
    const validReturnTo = validateReturnTo(returnTo)
    if (validReturnTo) {
      return NextResponse.redirect(validReturnTo)
    }

    // Priority 2: hub-internal `from` path (e.g. /sso/meetino?redirect_uri=... for Meetino SSO,
    // or a protected Hub page the user tried to access before being sent to login)
    const from = request.nextUrl.searchParams.get('from')
    if (from && from.startsWith('/') && !from.startsWith('//')) {
      return NextResponse.redirect(new URL(from, request.url))
    }

    // Priority 3: app context defaults (no returnTo, no from)
    const app = request.nextUrl.searchParams.get('app')
    if (app === 'career') {
      const careerUrl = process.env.NEXT_PUBLIC_CAREER_WEB_URL ?? 'http://localhost:3002'
      return NextResponse.redirect(`${careerUrl}/studio`)
    }
    if (app === 'meetino') {
      // Redirect authenticated users through Meetino SSO to get a Meetino session.
      const ssoUrl = new URL('/sso/meetino', request.url)
      ssoUrl.searchParams.set('redirect_uri', MEETINO_CALLBACK_URL)
      return NextResponse.redirect(ssoUrl)
    }

    // Priority 4: Hub default (proxy only knows cookie exists, not the role;
    // role-based portal/dashboard split is handled by login forms and root page)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Unauthenticated users — redirect to Irno ID Hosted Login ────────────────
  if (!isPublicRoute(pathname) && !pathname.startsWith('/_next') && !accessToken) {
    const loginUrl = new URL('/auth/login', request.url)
    // Preserve full path + query (e.g. /sso/meetino?redirect_uri=...)
    const fullPath = pathname + request.nextUrl.search
    loginUrl.searchParams.set('from', fullPath)

    // Detect SSO routes (e.g. /sso/meetino) and add app context for Irno ID
    // branding — so Irno ID Hosted UI can show "ورود به میتینو" instead of generic.
    const ssoMatch = pathname.match(/^\/sso\/([a-z0-9_-]+)/)
    if (ssoMatch && ssoMatch[1]) {
      loginUrl.searchParams.set('app', ssoMatch[1])
    }

    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - /api/* (API proxy routes — handled by Next.js rewrites)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
