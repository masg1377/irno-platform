/**
 * @irno/auth-client
 *
 * Internal lightweight SDK for Irno apps to integrate with Irno ID.
 *
 * Architecture: OIDC-ready redirect-based SSO (not full OIDC).
 * Hub/Irno ID is the central identity. Apps consume it via redirect flow.
 *
 * Key principle: No secrets in this package. Public-safe config only.
 *
 * Usage (Meetino, after Phase 10 monorepo consolidation):
 *   import { createIrnoAuthClient } from '@irno/auth-client'
 *
 *   const auth = createIrnoAuthClient({
 *     irnoIdBaseUrl: process.env.NEXT_PUBLIC_IRNO_ID_URL!,
 *     appId: 'meetino',
 *     appName: 'میتینو',
 *     redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/irno/callback`,
 *   })
 *
 * Until Phase 10 (monorepo consolidation), Meetino uses this pattern
 * manually in its auth pages. After consolidation, import @irno/auth-client directly.
 *
 * @see packages/auth-client/src/client.ts — client factory
 * @see packages/auth-client/src/url-builder.ts — URL construction
 * @see packages/auth-client/src/types.ts — TypeScript types
 */

// Client factory
export { createIrnoAuthClient } from './client'
export type { IrnoAuthClient } from './client'

// URL builders (also available standalone)
export { buildLoginUrl, buildRegisterUrl, buildLogoutUrl, isAllowedRedirectUri } from './url-builder'

// Types
export type {
  IrnoAuthClientConfig,
  IrnoAuthUser,
  IrnoAuthSession,
  LoginUrlOptions,
  RegisterUrlOptions,
  LogoutUrlOptions,
} from './types'
