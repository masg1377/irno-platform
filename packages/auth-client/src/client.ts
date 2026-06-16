/**
 * @irno/auth-client — IrnoAuthClient factory
 *
 * Lightweight internal SDK for Irno apps to integrate with Irno ID.
 * Similar in spirit to AWS Amplify Auth, but minimal and Irno-specific.
 *
 * Architecture notes:
 * - No long-lived tokens in localStorage (XSS risk).
 * - Tokens stay in memory (client) or HttpOnly cookies (server).
 * - This package only handles URL building and public-safe config.
 * - No secrets here. Backend secrets (client_secret, JWT_SECRET) never come here.
 * - OIDC-ready architecture — not a full OIDC implementation.
 *
 * Usage:
 *   const auth = createIrnoAuthClient({
 *     irnoIdBaseUrl: 'http://localhost:3000',
 *     appId: 'meetino',
 *     appName: 'میتینو',
 *     redirectUri: 'http://localhost:3001/auth/irno/callback',
 *   })
 *
 *   // In Meetino login page:
 *   const loginUrl = auth.buildLoginUrl({ returnTo: '/dashboard' })
 *   window.location.href = loginUrl
 */

import type { IrnoAuthClientConfig, LoginUrlOptions, LogoutUrlOptions, RegisterUrlOptions } from './types'
import { buildLoginUrl, buildLogoutUrl, buildRegisterUrl } from './url-builder'

export interface IrnoAuthClient {
  readonly config: Readonly<IrnoAuthClientConfig>

  /** Build URL to send user to Irno ID Hosted Login. */
  buildLoginUrl(options?: LoginUrlOptions): string

  /** Build URL to send user to Irno ID Hosted Register. */
  buildRegisterUrl(options?: RegisterUrlOptions): string

  /** Build URL to redirect after logout. */
  buildLogoutUrl(options?: LogoutUrlOptions): string

  /**
   * Start SSO login — redirects browser to Irno ID Hosted Login.
   * Only usable in browser context.
   */
  startSsoLogin(options?: LoginUrlOptions): void

  /**
   * Start SSO register — redirects browser to Irno ID Hosted Register.
   * Only usable in browser context.
   */
  startSsoRegister(options?: RegisterUrlOptions): void
}

/**
 * Create an IrnoAuthClient instance.
 *
 * @param config - App-specific Irno ID configuration (public-safe, no secrets).
 */
export function createIrnoAuthClient(config: IrnoAuthClientConfig): IrnoAuthClient {
  return {
    config: Object.freeze({ ...config }),

    buildLoginUrl(options = {}) {
      return buildLoginUrl(config, options)
    },

    buildRegisterUrl(options = {}) {
      return buildRegisterUrl(config, options)
    },

    buildLogoutUrl(options = {}) {
      return buildLogoutUrl(config, options)
    },

    startSsoLogin(options = {}) {
      if (typeof window === 'undefined') {
        throw new Error('startSsoLogin() can only be called in a browser context')
      }
      window.location.href = buildLoginUrl(config, options)
    },

    startSsoRegister(options = {}) {
      if (typeof window === 'undefined') {
        throw new Error('startSsoRegister() can only be called in a browser context')
      }
      window.location.href = buildRegisterUrl(config, options)
    },
  }
}
