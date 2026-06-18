import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { CareerProfileController } from './career-profile.controller'
import { CareerService } from './career.service'
import { ResumeController } from './resume.controller'
import { ResumeSectionsController } from './resume-sections.controller'
import { PortfolioController } from './portfolio.controller'
import { RoadmapController } from './roadmap.controller'
import { JobMatchController } from './job-match.controller'
import { CareerExportController } from './career-export.controller'
import { ResumeCheckerController, StandaloneCheckerController } from './resume-checker.controller'
import { ResumeCheckerService } from './resume-checker.service'
import { CareerExportService } from './career-export.service'
import { CareerPdfService } from './career-pdf.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [
    // Memory storage for uploaded resume files (not persisted to disk)
    MulterModule.register({ dest: undefined }), // memory storage via no dest
    RedisModule,
  ],
  controllers: [
    CareerProfileController,
    ResumeController,
    ResumeSectionsController,
    PortfolioController,
    RoadmapController,
    JobMatchController,
    CareerExportController,
    ResumeCheckerController,
    StandaloneCheckerController,
  ],
  providers: [CareerService, ResumeCheckerService, CareerExportService, CareerPdfService, PrismaService],
  exports: [CareerService],
})
export class CareerModule {}
