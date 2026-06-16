import { SetMetadata } from '@nestjs/common'

/**
 * Rate limit configuration attached to a route via @RateLimit().
 *
 * key     — unique name for this limit bucket (e.g. 'otp-request')
 * max     — max requests allowed in the window
 * windowS — window size in seconds
 * keyBy   — what to use as the per-request identifier:
 *           'ip'       — IP address only (for public/unauthenticated routes)
 *           'user'     — authenticated userId only (fails open if no user)
 *           'ip+user'  — userId if available, else IP (best of both)
 */
export interface RateLimitConfig {
  key: string
  max: number
  windowS: number
  keyBy: 'ip' | 'user' | 'ip+user'
}

export const RATE_LIMIT_KEY = 'irno:rate-limit'

/**
 * Apply a Redis-backed fixed-window rate limit to a route.
 *
 * Example:
 *   @RateLimit({ key: 'otp-request', max: 3, windowS: 120, keyBy: 'ip' })
 *   @Post('otp/request')
 *   async requestOtp(...) {}
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config)
