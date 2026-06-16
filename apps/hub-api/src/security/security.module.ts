import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { RedisModule } from '../redis/redis.module.js'
import { RateLimitGuard } from './rate-limit.guard.js'
import { SecurityLogService } from './security-log.service.js'

/**
 * SecurityModule — global rate limiting + security event logging.
 *
 * Registered as @Global so SecurityLogService can be injected anywhere
 * without re-importing.
 *
 * RateLimitGuard is registered as an APP_GUARD so it runs on every
 * request. Routes without @RateLimit() are passed through immediately
 * with no overhead.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [
    SecurityLogService,
    // Global rate-limit guard — runs after JwtAuthGuard so user.userId is available
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [SecurityLogService],
})
export class SecurityModule {}
