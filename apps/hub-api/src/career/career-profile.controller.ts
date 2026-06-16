import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { CareerService } from './career.service'
import { CareerExportService } from './career-export.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { RateLimit } from '../security/rate-limit.decorator'
import { UpdateCareerProfileDto } from './dto/update-career-profile.dto'
import { UpdatePublicSettingsDto } from './dto/update-public-settings.dto'
import type { CurrentUser } from '@irno/types'

/**
 * CareerProfileController — career profile and public resume endpoints.
 *
 * Base path: /api/v1/career
 */
@Controller('career')
export class CareerProfileController {
  constructor(
    private readonly careerService: CareerService,
    private readonly careerExportService: CareerExportService,
  ) {}

  /**
   * GET /api/v1/career/me
   * Get or create the current user's career profile.
   */
  @Get('me')
  async getOrCreateProfile(@CurrentUserDec() user: CurrentUser) {
    return this.careerService.getOrCreateCareerProfile(user.id)
  }

  /**
   * PATCH /api/v1/career/profile
   * Update the current user's career profile (basic info).
   */
  @Patch('profile')
  async updateCareerProfile(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: UpdateCareerProfileDto,
  ) {
    return this.careerService.updateCareerProfile(user.id, dto)
  }

  /**
   * PATCH /api/v1/career/profile/public-settings
   * Update public visibility settings: slug, visibility, contact visibility, SEO.
   * Declared BEFORE /:slug to avoid route conflict.
   */
  @Patch('profile/public-settings')
  async updatePublicSettings(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: UpdatePublicSettingsDto,
  ) {
    return this.careerService.updatePublicSettings(user.id, dto)
  }

  /**
   * GET /api/v1/career/public/:slug
   * Publicly accessible profile by slug. No auth required.
   * Response includes resume.hasPdfExport to drive DownloadButton behaviour.
   */
  // 60 public profile views per minute per IP (anti-scraping)
  @RateLimit({ key: 'public-profile', max: 60, windowS: 60, keyBy: 'ip' })
  @Public()
  @Get('public/:slug')
  async getPublicResume(@Param('slug') slug: string) {
    return this.careerService.getPublicResume(slug)
  }

  /**
   * GET /api/v1/career/public/:slug/resume/download
   * Downloads the latest generated PDF for a public profile.
   *
   * Requirements:
   *  - Profile must be public (not PRIVATE / DISABLED)
   *  - Resume must have visibility PUBLIC_LINK
   *  - allowPdfDownload must be true on the resume
   *  - A GENERATED PDF export must exist
   *
   * Returns Content-Type: application/pdf.
   * Returns 404 if no PDF is available (visitor should fall back to browser print).
   */
  // 20 public PDF downloads per 10 minutes per IP
  @RateLimit({ key: 'public-pdf-download', max: 20, windowS: 600, keyBy: 'ip' })
  @Public()
  @Get('public/:slug/resume/download')
  async downloadPublicResume(
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.careerExportService.getPublicResumeDownload(slug)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'public, max-age=300') // 5-min cache for public PDFs
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(buffer)
  }

  /**
   * GET /api/v1/career/public/:slug/projects/:projectSlug
   * Returns a single public portfolio project by profile slug + project slug.
   * Profile must not be PRIVATE/DISABLED.
   * Project visibility must be PUBLIC_LINK or PUBLIC.
   */
  // 60 public project views per minute per IP
  @RateLimit({ key: 'public-project', max: 60, windowS: 60, keyBy: 'ip' })
  @Public()
  @Get('public/:slug/projects/:projectSlug')
  async getPublicProject(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.careerService.getPublicPortfolioProject(slug, projectSlug)
  }
}
