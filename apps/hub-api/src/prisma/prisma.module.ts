import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/**
 * Global module — PrismaService is available to all modules
 * without needing to import PrismaModule explicitly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
