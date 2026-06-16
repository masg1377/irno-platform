import { Module } from '@nestjs/common'
import { StudentSkillsController } from './student-skills.controller'
import { StudentSkillsService } from './student-skills.service'
import { PrismaModule } from '../prisma/prisma.module'
import { SkillsModule } from '../skills/skills.module'
import { CreditsModule } from '../credits/credits.module'

@Module({
  imports: [PrismaModule, SkillsModule, CreditsModule],
  controllers: [StudentSkillsController],
  providers: [StudentSkillsService],
  exports: [StudentSkillsService],
})
export class StudentSkillsModule {}
