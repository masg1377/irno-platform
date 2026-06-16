import { Module } from '@nestjs/common'
import { ApplicantsController } from './applicants.controller'
import { ApplicantsService } from './applicants.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ApplicantsController],
  providers: [ApplicantsService],
  exports: [ApplicantsService],
})
export class ApplicantsModule {}
