import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'
import { CareerExportService } from './career-export.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { RateLimit } from '../security/rate-limit.decorator'
import { CreateExportDto } from './dto/create-export.dto'
import type { CurrentUser } from '@irno/types'

/**
 * CareerExportController — resume export generation, listing, and download.
 *
 * Routes:
 *   POST   /api/v1/career/resumes/:id/export                      — trigger new export (HTML or PDF)
 *   GET    /api/v1/career/resumes/:id/exports                     — list exports (max 20)
 *   GET    /api/v1/career/resumes/:id/exports/:exportId           — single export detail
 *   GET    /api/v1/career/resumes/:id/exports/:exportId/download  — download HTML or PDF file
 */
@Controller('career/resumes')
export class CareerExportController {
  constructor(private readonly careerExportService: CareerExportService) {}

  /**
   * POST /api/v1/career/resumes/:id/export
   * Trigger a new export. HTML is instant; PDF takes ~5–15 seconds (Playwright).
   */
  // 20 exports per hour per user (HTML + PDF combined)
  @RateLimit({ key: 'export-trigger', max: 20, windowS: 3600, keyBy: 'user' })
  @Post(':id/export')
  @HttpCode(HttpStatus.CREATED)
  async triggerExport(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: CreateExportDto,
  ) {
    return this.careerExportService.triggerExport(id, user.id, dto)
  }

  /**
   * GET /api/v1/career/resumes/:id/exports
   * List all export records for a resume (newest first, max 20).
   */
  @Get(':id/exports')
  async listExports(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.careerExportService.listExports(id, user.id)
  }

  /**
   * GET /api/v1/career/resumes/:id/exports/:exportId
   * Get a single export record (metadata only, no htmlSnapshot in body).
   */
  @Get(':id/exports/:exportId')
  async getExport(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Param('exportId') exportId: string,
  ) {
    return this.careerExportService.getExport(id, exportId, user.id)
  }

  /**
   * GET /api/v1/career/resumes/:id/exports/:exportId/download
   *
   * For HTML exports: returns Content-Type: text/html, filename .html
   * For PDF exports:  returns Content-Type: application/pdf, filename .pdf
   */
  @Get(':id/exports/:exportId/download')
  async downloadExport(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Param('exportId') exportId: string,
    @Res() res: Response,
  ) {
    const result = await this.careerExportService.downloadExport(id, exportId, user.id)

    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (result.format === 'PDF') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
      res.send(result.buffer)
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
      res.send(result.html)
    }
  }
}
