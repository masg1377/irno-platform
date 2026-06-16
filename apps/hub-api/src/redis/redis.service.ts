import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import type { ApiEnv } from '@irno/validators'

/**
 * RedisService wraps ioredis for NestJS.
 * Provides basic get/set/del operations and a ping for health checks.
 *
 * Phase 2+ will use this for:
 *   - Refresh token storage
 *   - Dashboard stats caching (Phase 7)
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client!: Redis

  constructor(private readonly config: ConfigService<ApiEnv, true>) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.config.get('REDIS_HOST'),
      port: this.config.get('REDIS_PORT'),
      password: this.config.get('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    })

    this.client.on('error', (err) => {
      this.logger.error('Redis error:', err.message)
    })

    await this.client.connect()
    this.logger.log('Redis connected')
  }

  async onModuleDestroy() {
    await this.client.quit()
    this.logger.log('Redis disconnected')
  }

  async ping(): Promise<string> {
    return this.client.ping()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /**
   * Atomically increment a counter and set TTL on first access.
   * Used by the rate limiter (fixed-window algorithm).
   *
   * Lua script ensures atomicity: if this is the first increment
   * in the window, EXPIRE is set immediately — no race condition.
   *
   * Returns the new counter value after increment.
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const script = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return count
    `
    const result = await this.client.eval(script, 1, key, ttlSeconds.toString())
    return result as number
  }

  /**
   * Get the remaining TTL (in seconds) of a key.
   * Returns -2 if key does not exist, -1 if no TTL set.
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }
}
