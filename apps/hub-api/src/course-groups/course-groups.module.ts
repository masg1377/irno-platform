import { Module } from '@nestjs/common'
import { CourseGroupsController } from './course-groups.controller'
import { CourseGroupsService } from './course-groups.service'
import { PrismaModule } from '../prisma/prisma.module'
import { MeetinoIntegrationModule } from '../meetino-integration/meetino-integration.module'

@Module({
  imports: [PrismaModule, MeetinoIntegrationModule],
  controllers: [CourseGroupsController],
  providers: [CourseGroupsService],
  exports: [CourseGroupsService],
})
export class CourseGroupsModule {}
