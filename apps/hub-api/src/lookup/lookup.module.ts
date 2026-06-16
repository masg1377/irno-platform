import { Module } from '@nestjs/common'
import { LookupController } from './lookup.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LookupController],
})
export class LookupModule {}
