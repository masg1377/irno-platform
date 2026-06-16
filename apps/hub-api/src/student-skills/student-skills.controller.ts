import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common'
import { StudentSkillsService } from './student-skills.service'
import { AwardSkillDto } from './dto/award-skill.dto'
import { AwardCreditDto } from './dto/award-credit.dto'
import { RevokeCreditDto } from './dto/revoke-credit.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { UserRole } from '@irno/types'
import type { CurrentUser } from '@irno/types'

/**
 * StudentSkillsController — manage skills and credits for a specific student.
 *
 * Base path: /api/v1/students/:id/skills and /api/v1/students/:id/credits
 *
 * Shares the /students prefix with StudentsController.
 * NestJS merges routes from multiple controllers with the same prefix.
 */
@Controller('students')
export class StudentSkillsController {
  constructor(private readonly studentSkillsService: StudentSkillsService) {}

  // ─── Skills ────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/students/:id/skills
   * List all skills awarded to a student.
   */
  @Get(':id/skills')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  getStudentSkills(@Param('id') studentId: string) {
    return this.studentSkillsService.getStudentSkills(studentId)
  }

  /**
   * POST /api/v1/students/:id/skills
   * Award (or update) a skill for a student.
   */
  @Post(':id/skills')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  awardSkill(
    @Param('id') studentId: string,
    @Body() dto: AwardSkillDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.studentSkillsService.awardSkill(studentId, dto, actor.id)
  }

  /**
   * DELETE /api/v1/students/:id/skills/:studentSkillId
   * Remove a skill record from a student.
   */
  @Delete(':id/skills/:studentSkillId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeSkill(
    @Param('id') studentId: string,
    @Param('studentSkillId') studentSkillId: string,
  ) {
    return this.studentSkillsService.removeSkill(studentId, studentSkillId)
  }

  // ─── Credits ───────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/students/:id/credits
   * List all credits awarded to a student.
   */
  @Get(':id/credits')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  getStudentCredits(@Param('id') studentId: string) {
    return this.studentSkillsService.getStudentCredits(studentId)
  }

  /**
   * POST /api/v1/students/:id/credits
   * Award a credit to a student.
   */
  @Post(':id/credits')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  awardCredit(
    @Param('id') studentId: string,
    @Body() dto: AwardCreditDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.studentSkillsService.awardCredit(studentId, dto, actor.id)
  }

  /**
   * PATCH /api/v1/students/:id/credits/:studentCreditId/revoke
   * Revoke a credit from a student.
   */
  @Patch(':id/credits/:studentCreditId/revoke')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  revokeCredit(
    @Param('id') studentId: string,
    @Param('studentCreditId') studentCreditId: string,
    @Body() dto: RevokeCreditDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.studentSkillsService.revokeCredit(studentId, studentCreditId, actor.id, dto)
  }
}
