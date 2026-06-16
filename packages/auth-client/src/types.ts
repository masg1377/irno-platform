/**
 * @irno/auth-client — Type definitions
 *
 * OIDC-ready architecture. Not a full OIDC implementation.
 * Do not claim full OIDC compliance.
 */

// ── Configuration ──────────────────────────────────────────────────────────

export interface IrnoAuthClientConfig {
  /**
   * Base URL of the Irno ID Hosted UI (Hub web).
   * e.g. https://id.irno.ir or http://localhost:3000
   */
  irnoIdBaseUrl: string

  /**
   * Identifier for this client application.
   * e.g. 'meetino', 'hub', 'learn'
   * Used as ?app= query param in auth URLs.
   */
  appId: string

  /**
   * Human-readable name of this application (Persian).
   * Shown in auth UI: "ورود به {appName} با حساب ایرنو"
   */
  appName?: string

  /**
   * URL where the user is sent after successful login/register.
   * For SSO apps: this is the callback URL that receives the ?code=.
   * e.g. http://localhost:3001/auth/irno/callback
   */
  redirectUri: string

  /**
   * Where to redirect after logout (optional).
   * Defaults to irnoIdBaseUrl/auth/login.
   */
  postLogoutRedirectUri?: string
}

// ── Auth User ──────────────────────────────────────────────────────────────

/**
 * Irno ID user identity, as provided to client apps after SSO exchange.
 * Hub is the source of truth — this reflects Hub's IrnoIdentityClaims.
 */
export interface IrnoAuthUser {
  /** Hub user UUID — primary key across all Irno apps */
  hubUserId: string
  /** Hub student UUID — null for staff */
  hubStudentId: string | null
  /** Full display name */
  displayName: string
  /** Mobile number */
  mobile: string | null
  /** Email address */
  email: string | null
  /** Hub role string */
  role: string
  /** Apps this user has access to */
  appAccess: string[]
  /** ISO timestamp of when the identity was issued */
  issuedAt: string
  /** ISO timestamp of expiry */
  expiresAt: string
}

// ── Session ────────────────────────────────────────────────────────────────

export interface IrnoAuthSession {
  /** The app-local access token (e.g. Meetino JWT) */
  accessToken: string
  /** Seconds until access token expires */
  expiresIn: number
  /** Irno ID user identity */
  user: IrnoAuthUser | null
}

// ── URL Builder Options ────────────────────────────────────────────────────

export interface LoginUrlOptions {
  /** Override the config redirectUri */
  redirectUri?: string
  /** Path to return to INSIDE the calling app after login */
  returnTo?: string
  /** Hint to show on Irno ID login page */
  appContext?: string
}

export interface RegisterUrlOptions extends LoginUrlOptions {}

export interface LogoutUrlOptions {
  /** Override the config postLogoutRedirectUri */
  postLogoutRedirectUri?: string
}
