/**
 * Redis key namespace constants for Irno Platform.
 *
 * Rules (enforced here):
 *  - Every key is prefixed with `irno:` so all Irno keys are visible together
 *    in Redis keyspace inspection tools.
 *  - No key is constructed outside this file except in Meetino (separate app).
 *  - All keys that hold sensitive data (tokens, OTPs, SSO codes) must have TTL.
 *  - Never log raw key values that contain secrets (OTP code, token hash).
 *
 * Key pattern policy:
 *
 *  Auth / Sessions
 *    irno:rt:{userId}                  — Refresh token hash (bcrypt)       TTL: JWT_REFRESH_TTL
 *
 *  OTP
 *    irno:otp:cooldown:{mobile}        — Resend cooldown sentinel           TTL: OTP_RESEND_COOLDOWN_SECONDS
 *    irno:otp:attempt:{mobile}         — Failed attempt counter             TTL: OTP_TTL_SECONDS
 *
 *  SSO
 *    irno:sso:code:{code}              — One-time exchange code             TTL: MEETINO_SSO_CODE_TTL_SECONDS
 *
 *  Rate limiting
 *    irno:rate:{scope}:{identifier}    — Fixed-window counter               TTL: per window
 *
 *  PDF export
 *    irno:pdf:lock:{resumeId}          — Per-resume export lock (future)    TTL: export timeout
 *
 *  Cache
 *    irno:cache:templates              — Resume templates list              TTL: 15min
 *    irno:cache:taxonomy:{type}        — Taxonomy terms by type             TTL: 5min
 *    irno:cache:public-profile:{slug}  — Public profile response            TTL: 60s
 *
 *  Meetino (managed by meetino-api, documented here for visibility)
 *    meetino:room:{slug}:state         — Live participant presence hash      TTL: 12h
 */

/** Auth — refresh token hash per user (one active session per user) */
export const RedisKey = {
  refreshToken: (userId: string) => `irno:rt:${userId}`,

  otpCooldown: (mobile: string) => `irno:otp:cooldown:${mobile}`,
  otpAttempt:  (mobile: string) => `irno:otp:attempt:${mobile}`,

  ssoCode: (code: string) => `irno:sso:code:${code}`,

  rateLimit: (scope: string, identifier: string) => `irno:rate:${scope}:${identifier}`,

  pdfLock: (resumeId: string) => `irno:pdf:lock:${resumeId}`,

  cacheTemplates:       () => 'irno:cache:templates',
  cacheTaxonomy:        (type: string) => `irno:cache:taxonomy:${type}`,
  cachePublicProfile:   (slug: string) => `irno:cache:public-profile:${slug}`,
} as const
