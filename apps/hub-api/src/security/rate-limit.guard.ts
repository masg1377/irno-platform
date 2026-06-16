import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { RedisService } from '../redis/redis.service.js'
import { RATE_LIMIT_KEY, type RateLimitConfig } from './rate-limit.decorator.js'
import { SecurityLogService } from './security-log.service.js'

/**
 * Redis-backed fixed-window rate limiter.
 *
 * Applied globally — routes without @RateLimit() pass through immediately.
 * Routes with @RateLimit() are counted per window.
 *
 * Algorithm: fixed window using Redis INCR + Lua atomic TTL-on-first-hit.
 * Not a sliding window — may allow 2× max requests at window boundaries
 * for rare bursty cases. Acceptable for MVP abuse prevention.
 *
 * On Redis failure: fail open (let the request through) to avoid
 * an infrastructure blip taking down the whole API. Log the error.
 *
 * 429 response body:
 *   { error: { statusCode: 429, message: '...Persian...', retryAfterSeconds: N } }
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly securityLog: SecurityLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    )

    // No rate limit configured — pass through
    if (!config) return true

    const request = context.switchToHttp().getRequest<Request & { user?: { userId?: string } }>()

    // Resolve the rate-limit identifier
    const identifier = this.resolveIdentifier(request, config.keyBy)
    const redisKey = `rl:${config.key}:${identifier}`

    try {
      const count = await this.redis.incrWithTtl(redisKey, config.windowS)

      if (count > config.max) {
        const retryAfter = await this.redis.ttl(redisKey)

        this.logger.warn(
          `Rate limit hit: key=${config.key} id=${identifier} count=${count}/${config.max} ttl=${retryAfter}s`,
        )

        // Structured security event log
        this.securityLog.rateLimitHit({
          ip: this.extractIp(request),
          key: config.key,
          userId: request.user?.userId,
          retryAfter: retryAfter > 0 ? retryAfter : config.windowS,
        })

        throw new HttpException(
          {
            error: {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message:
                'درخواست‌های شما بیش از حد مجاز است. لطفاً چند لحظه دیگر تلاش کنید.',
              retryAfterSeconds: retryAfter > 0 ? retryAfter : config.windowS,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      return true
    } catch (err) {
      // If it's our own 429, re-throw it
      if (err instanceof HttpException) throw err

      // Redis failure — log and fail open (don't block users due to infra issue)
      this.logger.error(`Rate limiter Redis failure for key=${config.key}: ${(err as Error).message}`)
      return true
    }
  }

  private resolveIdentifier(
    request: Request & { user?: { userId?: string } },
    keyBy: RateLimitConfig['keyBy'],
  ): string {
    const ip = this.extractIp(request)
    const userId = request.user?.userId ?? null

    switch (keyBy) {
      case 'ip':
        return `ip:${ip}`
      case 'user':
        return userId ? `u:${userId}` : `ip:${ip}`
      case 'ip+user':
        return userId ? `u:${userId}` : `ip:${ip}`
    }
  }

  private extractIp(request: Request): string {
    // Trust X-Forwarded-For only if behind a known proxy (Nginx sets this).
    // In production, Nginx is the only entry point, so the first value is real.
    const forwarded = request.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0]?.trim()
      if (first) return first
    }
    return request.socket?.remoteAddress ?? 'unknown'
  }
}
