import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy — cookie-based route protection for career-web.
 *
 * Auth: uses irno_at cookie issued by Irno ID (hub-web).
 *
 * Public routes (no auth required):
 *   - / (landing page)
 *   - /cv, /public-profile, /pricing, /login, /register
 *   - /checker, /templates, /portfolio, /roadmap, /job-match (public product pages)
 *   - /public/* (public resume pages)
 *   - /u/*
 *
 * Authenticated routes (redirect to Irno ID login if no token):
 *   - /resumes, /builder, /profile, /settings
 *   - /studio/* (authenticated app)
 */

// Exact-match public paths
const PUBLIC_EXACT = new Set(['/', '/cv', '/public-profile', '/pricing', '/login', '/register'])

// Public prefix matches
const PUBLIC_PREFIXES = [
  '/public/',
  '/u/',
  '/checker',
  '/templates',
  '/portfolio',
  '/roadmap',
  '/job-match',
]

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
const CAREER_WEB_URL = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('irno_at')?.value

  if (!isPublicRoute(pathname) && !pathname.startsWith('/_next') && !accessToken) {
    const loginUrl = new URL('/auth/login', HUB_WEB_URL)
    loginUrl.searchParams.set('app', 'career')
    loginUrl.searchParams.set('from', `${CAREER_WEB_URL}${pathname}`)
    return NextResponse.redirect(loginUrl)
  }

  // Inject pathname header so server-component layouts can detect the current route
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
