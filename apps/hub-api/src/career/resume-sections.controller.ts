import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { CareerService } from './career.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { CreateSectionDto } from './dto/create-section.dto'
import { UpdateSectionDto } from './dto/update-section.dto'
import { ReorderSectionsDto } from './dto/reorder-sections.dto'
import type { CurrentUser } from '@irno/types'

/**
 * ResumeSectionsController — section management for a specific resume.
 *
 * Base path: /api/v1/career/resumes/:resumeId/sections
 */
@Controller('career/resumes/:resumeId/sections')
export class ResumeSectionsController {
  constructor(private readonly careerService: CareerService) {}

  /**
   * GET /api/v1/career/resumes/:resumeId/sections
   * List all visible sections for a resume, ordered by sortOrder.
   */
  @Get()
  async listSections(
    @CurrentUserDec() user: CurrentUser,
    @Param('resumeId') resumeId: string,
  ) {
    return this.careerService.listSections(resumeId, user.id)
  }

  /**
   * POST /api/v1/career/resumes/:resumeId/sections
   * Add a new section to a resume.
   */
  @Post()
  async createSection(
    @CurrentUserDec() user: CurrentUser,
    @Param('resumeId') resumeId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.careerService.createSection(resumeId, user.id, dto)
  }

  /**
   * PATCH /api/v1/career/resumes/:resumeId/sections/reorder
   * Reorder sections by providing an ordered array of sectionIds.
   * Must be declared before /:sectionId to avoid route conflict.
   */
  @Patch('reorder')
  async reorderSections(
    @CurrentUserDec() user: CurrentUser,
    @Param('resumeId') resumeId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    return this.careerService.reorderSections(resumeId, user.id, dto.sectionIds)
  }

  /**
   * PATCH /api/v1/career/resumes/:resumeId/sections/:sectionId
   * Update a specific section's content, title, visibility, or sort order.
   */
  @Patch(':sectionId')
  async updateSection(
    @CurrentUserDec() user: CurrentUser,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.careerService.updateSection(resumeId, sectionId, user.id, dto)
  }

  /**
   * DELETE /api/v1/career/resumes/:resumeId/sections/:sectionId
   * Hard-delete a section (sections have no soft-delete).
   */
  @Delete(':sectionId')
  @HttpCode(HttpStatus.OK)
  async deleteSection(
    @CurrentUserDec() user: CurrentUser,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.careerService.deleteSection(resumeId, sectionId, user.id)
  }
}
