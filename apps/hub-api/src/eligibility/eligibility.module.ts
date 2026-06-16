import { Module } from '@nestjs/common'
import { EligibilityService } from './eligibility.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}
