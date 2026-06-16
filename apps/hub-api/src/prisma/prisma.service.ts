import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * PrismaService wraps PrismaClient as a NestJS injectable.
 *
 * Prisma 7 requires a driver adapter for direct database connections.
 * The `url` field was removed from schema.prisma datasource blocks.
 * PrismaClient must now receive an `adapter` that carries the connection.
 *
 * For PostgreSQL we use @prisma/adapter-pg (the official Prisma pg adapter).
 * DATABASE_URL is read from process.env — set by NestJS ConfigModule at startup.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env['DATABASE_URL'],
    })

    super({
      adapter,
      log: process.env['NODE_ENV'] === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('PostgreSQL connected via Prisma')
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log('PostgreSQL disconnected')
  }

  /**
   * Soft-delete helper — sets deletedAt to now.
   * Use instead of .delete() for any model with a deletedAt field.
   */
  async softDelete(model: string, id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this as any)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
