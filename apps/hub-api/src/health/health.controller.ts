import { Controller, Get } from '@nestjs/common'
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { Public } from '../auth/decorators/public.decorator'

/**
 * HealthModule exposes two endpoints:
 *
 * GET /api/v1/health/live
 *   Liveness — is the process alive? Always returns 200 if running.
 *   Used by Docker/Kubernetes to decide whether to restart.
 *
 * GET /api/v1/health/ready
 *   Readiness — can the service handle requests?
 *   Checks PostgreSQL and Redis. Returns 503 if either is down.
 *   Used by load balancers to decide whether to route traffic.
 *
 * Both routes are @Public() — health checks must work without auth tokens.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  live(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRaw`SELECT 1`
          return { postgres: { status: 'up' } }
        } catch (error) {
          return { postgres: { status: 'down', error: String(error) } }
        }
      },
      async (): Promise<HealthIndicatorResult> => {
        try {
          const pong = await this.redis.ping()
          return { redis: { status: pong === 'PONG' ? 'up' : 'down' } }
        } catch (error) {
          return { redis: { status: 'down', error: String(error) } }
        }
      },
    ])
  }
}
