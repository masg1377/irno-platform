import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { CareerService } from './career.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { CreateResumeDto } from './dto/create-resume.dto'
import { UpdateResumeDto } from './dto/update-resume.dto'
import { ImportIrnoDataDto } from './dto/import-irno-data.dto'
import { UpdateResumeStyleDto, UpdateResumeTemplateDto, UpdateResumeWatermarkDto } from './dto/update-resume-style.dto'
import type { CurrentUser } from '@irno/types'

/**
 * ResumeController — resume CRUD and import endpoints.
 *
 * Base path: /api/v1/career/resumes
 */
@Controller('career/resumes')
export class ResumeController {
  constructor(private readonly careerService: CareerService) {}

  /**
   * GET /api/v1/career/resumes
   * List the current user's resumes (paginated).
   */
  @Get()
  async listResumes(
    @CurrentUserDec() user: CurrentUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.careerService.listResumes(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
  }

  /**
   * POST /api/v1/career/resumes
   * Create a new resume for the current user.
   */
  @Post()
  async createResume(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: CreateResumeDto,
  ) {
    const profile = await this.careerService.getOrCreateCareerProfile(user.id)
    return this.careerService.createResume(user.id, profile.id, dto)
  }

  /**
   * GET /api/v1/career/resumes/:id
   * Get a specific resume by id (must belong to current user).
   */
  @Get(':id')
  async getResume(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.careerService.getResume(id, user.id)
  }

  /**
   * PATCH /api/v1/career/resumes/:id
   * Update a resume's metadata (title, targetRole, language, visibility).
   */
  @Patch(':id')
  async updateResume(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.careerService.updateResume(id, user.id, dto)
  }

  /**
   * POST /api/v1/career/resumes/:id/duplicate
   * Duplicate a resume (copies all sections, resets visibility to PRIVATE).
   */
  @Post(':id/duplicate')
  async duplicateResume(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.careerService.duplicateResume(id, user.id)
  }

  /**
   * PATCH /api/v1/career/resumes/:id/style
   * Update resume style settings (font, accent color, spacing, etc.)
   */
  @Patch(':id/style')
  async updateResumeStyle(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateResumeStyleDto,
  ) {
    return this.careerService.updateResumeStyle(id, user.id, dto)
  }

  /**
   * PATCH /api/v1/career/resumes/:id/template
   * Change the resume's template.
   */
  @Patch(':id/template')
  async updateResumeTemplate(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateResumeTemplateDto,
  ) {
    return this.careerService.updateResumeTemplate(id, user.id, dto)
  }

  /**
   * PATCH /api/v1/career/resumes/:id/watermark
   * Update watermark settings (includeWatermark, watermarkConfig).
   */
  @Patch(':id/watermark')
  async updateResumeWatermark(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateResumeWatermarkDto,
  ) {
    return this.careerService.updateResumeWatermark(id, user.id, dto)
  }

  /**
   * DELETE /api/v1/career/resumes/:id
   * Soft-delete a resume.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteResume(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.careerService.deleteResume(id, user.id)
  }

  /**
   * POST /api/v1/career/resumes/:id/import-irno
   * Import skills, credits, certificates, and courses from Irno Hub
   * into the resume as structured sections.
   */
  @Post(':id/import-irno')
  async importFromIrno(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: ImportIrnoDataDto,
  ) {
    return this.careerService.importFromIrno(user.id, (user as any).studentId ?? null, id, dto)
  }
}
