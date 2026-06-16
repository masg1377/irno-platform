import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common'
import { SkillsService } from './skills.service'
import { CreateSkillDto } from './dto/create-skill.dto'
import { UpdateSkillDto } from './dto/update-skill.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, SkillLevel, SkillStatus } from '@irno/types'

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  /**
   * GET /api/v1/skills
   * List all skills (staff read).
   */
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.MENTOR,
    UserRole.STUDENT,
    UserRole.APPLICANT,
  )
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('categoryId') categoryId?: string,
    @Query('level') level?: SkillLevel,
    @Query('status') status?: SkillStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.skillsService.findAll({
      search,
      category,
      categoryId,
      level,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    })
  }

  /**
   * POST /api/v1/skills
   * Create a new skill (admin only).
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto)
  }

  /**
   * GET /api/v1/skills/:id
   * Get skill by ID.
   */
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.MENTOR,
    UserRole.STUDENT,
    UserRole.APPLICANT,
  )
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id)
  }

  /**
   * PATCH /api/v1/skills/:id
   * Update skill (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.update(id, dto)
  }

  /**
   * DELETE /api/v1/skills/:id
   * Soft delete (archive) a skill (admin only).
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.skillsService.delete(id)
  }
}
