/**
 * @irno/auth-client — URL Builders
 *
 * Builds URLs for Irno ID Hosted UI interactions.
 * All URL construction is pure and side-effect-free.
 *
 * Architecture: Redirect-based SSO (OIDC-style but not full OIDC).
 * - Login/Register → Hub /auth/* (Irno ID Hosted UI)
 * - SSO code exchange → Hub /sso/<appId>
 * - Callback → app-local /auth/irno/callback
 *
 * Do NOT use these to pass secrets. Config here is public-safe only.
 */

import type { IrnoAuthClientConfig, LoginUrlOptions, LogoutUrlOptions, RegisterUrlOptions } from './types'

/**
 * Build the Irno ID Hosted Login URL.
 *
 * Unauthenticated users: Hub proxy redirects them to /auth/login?app=<appId>.
 * Authenticated users: Hub /sso/<appId> generates the one-time SSO code.
 *
 * Flow:
 *   1. App links user to Hub /sso/<appId>?redirect_uri=<callback>
 *   2. Hub proxy checks auth → if not logged in, redirects to /auth/login?app=<appId>&from=<sso_url>
 *   3. User logs in → Hub redirects to /sso/<appId> → generates code → redirects to callback
 */
export function buildLoginUrl(config: IrnoAuthClientConfig, options: LoginUrlOptions = {}): string {
  const redirectUri = options.redirectUri ?? config.redirectUri
  const callbackUrl = new URL(redirectUri)

  if (options.returnTo) {
    callbackUrl.searchParams.set('returnTo', options.returnTo)
  }

  const ssoUrl = new URL(`/sso/${config.appId}`, config.irnoIdBaseUrl)
  ssoUrl.searchParams.set('redirect_uri', callbackUrl.toString())

  return ssoUrl.toString()
}

/**
 * Build the Irno ID Hosted Register URL.
 *
 * Sends the user to Hub /auth/register with app context.
 * After registration, Hub issues tokens and redirects back through SSO.
 */
export function buildRegisterUrl(config: IrnoAuthClientConfig, options: RegisterUrlOptions = {}): string {
  const redirectUri = options.redirectUri ?? config.redirectUri

  // After registration, user needs SSO code to get app-local session
  const ssoUrl = new URL(`/sso/${config.appId}`, config.irnoIdBaseUrl)
  ssoUrl.searchParams.set('redirect_uri', redirectUri)

  const registerUrl = new URL('/auth/register', config.irnoIdBaseUrl)
  registerUrl.searchParams.set('app', options.appContext ?? config.appId)
  // from= tells Hub where to redirect after registration (through SSO)
  registerUrl.searchParams.set('from', `/sso/${config.appId}?redirect_uri=${encodeURIComponent(redirectUri)}`)

  return registerUrl.toString()
}

/**
 * Build the logout URL.
 * For now, logout is app-local (clear local session/cookies).
 * Future: server-side Hub logout + postLogoutRedirectUri.
 */
export function buildLogoutUrl(config: IrnoAuthClientConfig, options: LogoutUrlOptions = {}): string {
  const postLogout = options.postLogoutRedirectUri ?? config.postLogoutRedirectUri
  if (postLogout) {
    const url = new URL('/auth/login', config.irnoIdBaseUrl)
    url.searchParams.set('post_logout_redirect_uri', postLogout)
    return url.toString()
  }
  return new URL('/auth/login', config.irnoIdBaseUrl).toString()
}

/**
 * Validate a redirect URI against an allowlist.
 * Use on the server — never trust redirect_uri from the browser without validation.
 *
 * @param redirectUri - The URI to validate
 * @param allowedOrigins - e.g. ['http://localhost:3001', 'https://meet.irno.ir']
 */
export function isAllowedRedirectUri(redirectUri: string, allowedOrigins: string[]): boolean {
  try {
    const url = new URL(redirectUri)
    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    return allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed)
        return url.origin === allowedUrl.origin
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}
