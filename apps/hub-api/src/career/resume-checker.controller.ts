import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { detectSectionsFromText } from './resume-checker/resume-checker-engine.js'
import { FileInterceptor } from '@nestjs/platform-express'
import { ResumeCheckerService } from './resume-checker.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { RateLimit } from '../security/rate-limit.decorator'
import type { CurrentUser } from '@irno/types'

/**
 * ResumeCheckerController — Phase 16 advanced resume quality analysis.
 *
 * Irno resume endpoints (base: /api/v1/career/resumes):
 *   POST   /:id/check          — run check on an Irno resume
 *   GET    /:id/checks          — list previous checks for a resume
 *   GET    /:id/checks/:checkId — get a specific check report
 *
 * Standalone checker endpoints (base: /api/v1/career/checker):
 *   POST   /checker/text        — check pasted resume text
 *   POST   /checker/upload      — check uploaded PDF or TXT file
 *   GET    /checker/reports     — list all user check reports (all sources)
 *   GET    /checker/reports/:id — get a specific report
 */

// ── Irno resume checker ──────────────────────────────────────────────────────

@Controller('career/resumes')
export class ResumeCheckerController {
  constructor(private readonly checkerService: ResumeCheckerService) {}

  // 20 checks per hour per user
  @RateLimit({ key: 'checker-irno', max: 20, windowS: 3600, keyBy: 'user' })
  @Post(':id/check')
  async runCheck(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: { targetRole?: string; jobDescription?: string } = {},
  ) {
    return this.checkerService.checkResume(id, user.id, {
      targetRole: body.targetRole,
      jobDescription: body.jobDescription,
    })
  }

  @Get(':id/checks')
  async listChecks(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.checkerService.listChecks(id, user.id)
  }

  @Get(':id/checks/:checkId')
  async getCheck(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') _resumeId: string,
    @Param('checkId') checkId: string,
  ) {
    return this.checkerService.getCheck(checkId, user.id)
  }
}

// ── Standalone checker ────────────────────────────────────────────────────────

@Controller('career/checker')
export class StandaloneCheckerController {
  constructor(private readonly checkerService: ResumeCheckerService) {}

  /**
   * POST /api/v1/career/checker/text
   * Check pasted resume text (no Irno resume required).
   */
  // 10 text checks per hour per user
  @RateLimit({ key: 'checker-text', max: 10, windowS: 3600, keyBy: 'user' })
  @Post('text')
  async checkText(
    @CurrentUserDec() user: CurrentUser,
    @Body()
    body: {
      resumeText: string
      targetRole?: string
      jobDescription?: string
      language?: 'FA' | 'EN' | 'FA_EN'
    },
  ) {
    return this.checkerService.checkText(user.id, {
      resumeText: body.resumeText ?? '',
      targetRole: body.targetRole,
      jobDescription: body.jobDescription,
      language: body.language,
    })
  }

  /**
   * POST /api/v1/career/checker/upload
   * Upload a PDF or TXT resume file and run analysis.
   * File must be text-based (not scanned image).
   * Max size: 200 KB.
   */
  // 10 file uploads per hour per user
  @RateLimit({ key: 'checker-upload', max: 10, windowS: 3600, keyBy: 'user' })
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5_000_000 }, // 5 MB — PDFs can be large
      fileFilter: (_req, file, cb) => {
        const allowed = ['text/plain', 'application/pdf']
        const allowedExts = ['.txt', '.pdf']
        const ext = '.' + (file.originalname.split('.').pop() ?? '').toLowerCase()
        if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
          cb(null, true)
        } else {
          cb(new Error('فرمت فایل پشتیبانی نمی‌شود. PDF یا TXT ارسال کنید.'), false)
        }
      },
    }),
  )
  async checkUpload(
    @CurrentUserDec() user: CurrentUser,
    @UploadedFile() file: any, // Express.Multer.File — typed as any until @types/multer installed
    @Body()
    body: {
      targetRole?: string
      jobDescription?: string
      language?: 'FA' | 'EN' | 'FA_EN'
    },
  ) {
    if (!file) {
      return { error: 'فایلی ارسال نشده است.' }
    }
    return this.checkerService.checkUploadedFile(user.id, {
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      targetRole: body.targetRole,
      jobDescription: body.jobDescription,
      language: body.language,
    })
  }

  /**
   * GET /api/v1/career/checker/reports
   * List all check reports for the current user (all sources).
   */
  @Get('reports')
  async listReports(
    @CurrentUserDec() user: CurrentUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.checkerService.listReports(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 50) : 20,
    )
  }

  /**
   * GET /api/v1/career/checker/reports/:id
   * Get a specific check report (current user only).
   */
  @Get('reports/:id')
  async getReport(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.checkerService.getReport(id, user.id)
  }

  /**
   * POST /api/v1/career/checker/debug-parse
   * DEV ONLY — returns detected sections from plain text without running the full engine.
   * Useful for testing the section parser against real resumes.
   * Only enabled when NODE_ENV !== 'production'.
   */
  @Post('debug-parse')
  async debugParse(
    @Body() body: { text: string },
  ) {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Debug endpoint disabled in production.' }
    }
    const sections = detectSectionsFromText(body.text ?? '')
    return {
      sectionCount: sections.length,
      sections: sections.map((s) => ({
        type: s.type,
        titleDetected: s.titleDetected,
        confidence: s.confidence,
        detectionMethod: s.detectionMethod,
        startLine: s.startLine,
        contentPreview: s.content.slice(0, 200),
      })),
    }
  }
}
