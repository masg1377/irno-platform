import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /logout?redirect=<url>
 *
 * Logs the user out of Hub (clears irno_at / irno_rt cookies server-side)
 * and redirects to the given URL (defaults to /login).
 *
 * Used by Meetino and other apps to perform SSO single-logout:
 *   After local logout → redirect to http://localhost:3000/logout?redirect=http://localhost:3001/login
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const redirectTo = searchParams.get('redirect') ?? '/login'

  // Call Hub API to invalidate the refresh token server-side
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('irno_at')?.value
  if (accessToken) {
    const hubApiUrl = process.env.HUB_API_INTERNAL_URL ?? 'http://localhost:4000'
    await fetch(`${hubApiUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `irno_at=${accessToken}` },
      signal: AbortSignal.timeout(3_000),
    }).catch(() => {
      // Best-effort — clear cookies regardless
    })
  }

  // Validate redirect — only allow http/https to prevent open-redirect
  let safeRedirect = '/login'
  try {
    const parsed = new URL(redirectTo)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      safeRedirect = redirectTo
    }
  } catch {
    // relative path — allow
    if (redirectTo.startsWith('/')) safeRedirect = redirectTo
  }

  const response = NextResponse.redirect(
    safeRedirect.startsWith('http') ? safeRedirect : new URL(safeRedirect, request.url),
  )

  // Clear Hub auth cookies
  response.cookies.set('irno_at', '', { maxAge: 0, path: '/' })
  response.cookies.set('irno_rt', '', { maxAge: 0, path: '/' })

  return response
}
