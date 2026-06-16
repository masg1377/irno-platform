import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /sso/meetino?redirect_uri=<meetino_callback_url>
 *
 * Hub-side SSO route handler for Meetino identity handoff.
 *
 * Flow:
 *   1. Meetino login page links user to:
 *      <HUB_WEB_URL>/sso/meetino?redirect_uri=<meetino_callback_url>
 *   2. Hub proxy.ts requires irno_at cookie — unauthenticated users are
 *      redirected to /login?from=/sso/meetino?redirect_uri=... automatically.
 *   3. This handler (reached only when authenticated) calls Hub API to
 *      generate a one-time SSO code, then redirects to:
 *      <redirect_uri>?code=<sso_code>
 *
 * Security:
 *   - redirect_uri validation is enforced by Hub API (server-side whitelist)
 *   - The irno_at cookie is forwarded to Hub API; it is never returned to
 *     the browser as a value — only used server-to-server here
 *   - The generated SSO code is short-lived and one-time use
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const redirectUri = searchParams.get('redirect_uri')

  if (!redirectUri) {
    return NextResponse.json({ error: 'Missing redirect_uri' }, { status: 400 })
  }

  // Read Hub access token cookie (set by Hub API on login).
  // The proxy guarantees we only reach here when the cookie is present.
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('irno_at')?.value

  if (!accessToken) {
    // Defensive — should not reach here due to proxy; redirect to Irno ID Hosted Login.
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('app', 'meetino')
    loginUrl.searchParams.set('from', `/sso/meetino?redirect_uri=${encodeURIComponent(redirectUri)}`)
    return NextResponse.redirect(loginUrl)
  }

  // Call Hub API to generate a one-time SSO code.
  // This is a server-to-server call (Next.js server → NestJS).
  const hubApiUrl = process.env.HUB_API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const endpoint = `${hubApiUrl.replace(/\/$/, '')}/api/v1/integrations/meetino/sso/code`

  let code: string
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward Hub access token — server-to-server, never seen by browser
        Cookie: `irno_at=${accessToken}`,
      },
      body: JSON.stringify({ redirectUri }),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[SSO] Hub API error ${res.status}: ${body}`)

      if (res.status === 400) {
        // redirect_uri not in whitelist or invalid
        return NextResponse.json(
          { error: 'Invalid redirect destination. Contact Irno support.' },
          { status: 400 },
        )
      }
      if (res.status === 401 || res.status === 403) {
        // Token expired — send back to Irno ID Hosted Login
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('app', 'meetino')
        loginUrl.searchParams.set('from', `/sso/meetino?redirect_uri=${encodeURIComponent(redirectUri)}`)
        return NextResponse.redirect(loginUrl)
      }
      return NextResponse.json({ error: 'SSO code generation failed' }, { status: 502 })
    }

    // Hub API wraps responses in { data: <payload> } via ResponseInterceptor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const envelope = (await res.json()) as any
    const ssoCode: string | undefined = envelope?.data?.code ?? envelope?.code
    if (!ssoCode) {
      return NextResponse.json({ error: 'Unexpected SSO response' }, { status: 502 })
    }
    code = ssoCode
  } catch (err) {
    console.error('[SSO] Hub API unreachable:', err)
    return NextResponse.json({ error: 'Hub API unreachable' }, { status: 503 })
  }

  // Redirect browser to Meetino callback with the one-time code.
  // Preserve any extra query params the caller passed (e.g. returnTo).
  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', code)

  return NextResponse.redirect(callbackUrl.toString())
}
