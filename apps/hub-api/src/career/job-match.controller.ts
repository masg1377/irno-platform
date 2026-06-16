import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { CareerService } from './career.service'
import { ResumeCheckerService } from './resume-checker.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { RateLimit } from '../security/rate-limit.decorator'
import { CreateJobMatchDto } from './dto/create-job-match.dto'
import type { CurrentUser } from '@irno/types'

/**
 * JobMatchController — job match report endpoints.
 *
 * Base path: /api/v1/career/job-match
 *
 * Three resume source modes:
 *  1. POST /              — JSON body with resumeDocumentId (IRNO_RESUME) or resumeText (PASTED_TEXT)
 *  2. POST /upload        — multipart form with file (PDF/TXT) + jobDescription + optional fields
 *  3. GET  /              — list current user's reports
 *
 * Scoring: rule-based keyword match (same engine as Resume Checker).
 * AI-powered semantic matching is future work.
 *
 * Security:
 *  - All endpoints require authentication (JWT cookie via global JwtAuthGuard)
 *  - userId is always taken from the JWT — never from request body
 *  - Reports are scoped to the authenticated user's careerProfile
 */
@Controller('career/job-match')
export class JobMatchController {
  constructor(
    private readonly careerService: CareerService,
    private readonly checkerService: ResumeCheckerService,
  ) {}

  /**
   * GET /api/v1/career/job-match
   * List the current user's job match reports (newest first).
   */
  @Get()
  async listReports(
    @CurrentUserDec() user: CurrentUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.careerService.listJobMatchReports(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
  }

  /**
   * POST /api/v1/career/job-match
   * Create a job match report from JSON body.
   *
   * Modes:
   *  - resumeDocumentId provided → IRNO_RESUME (existing Irno CV resume)
   *  - resumeText provided → PASTED_TEXT (user pasted resume content)
   *  - neither → JD-only keyword analysis with advisory note
   *
   * jobDescription is required (min 30 chars).
   * Providing both resumeDocumentId and resumeText returns 400.
   */
  // 15 job match reports per hour per user
  @RateLimit({ key: 'job-match', max: 15, windowS: 3600, keyBy: 'user' })
  @Post()
  async createReport(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: CreateJobMatchDto,
  ) {
    const profile = await this.careerService.getOrCreateCareerProfile(user.id)
    return this.careerService.createJobMatch(user.id, profile.id, dto)
  }

  /**
   * POST /api/v1/career/job-match/upload
   * Create a job match report from an uploaded resume file.
   *
   * Request: multipart/form-data
   *   file           — PDF (selectable text) or TXT, max 5 MB
   *   jobDescription — required, min 30 chars
   *   jobTitle       — optional
   *   targetRole     — optional
   *
   * File is never stored — text is extracted in-memory and discarded.
   * Scanned/image PDFs return 400 with a clear Persian error.
   * Report is persisted with sourceType=UPLOADED_FILE and sourceFileName.
   */
  // 10 upload-based job match reports per hour per user
  @RateLimit({ key: 'job-match-upload', max: 10, windowS: 3600, keyBy: 'user' })
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5_000_000 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'text/plain',
        ]
        const name = file.originalname.toLowerCase()
        if (
          allowed.includes(file.mimetype) ||
          name.endsWith('.pdf') ||
          name.endsWith('.txt')
        ) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              'فرمت فایل پشتیبانی نمی‌شود. لطفاً فایل PDF یا TXT ارسال کنید.',
            ),
            false,
          )
        }
      },
    }),
  )
  async createReportFromUpload(
    @CurrentUserDec() user: CurrentUser,
    @UploadedFile() file: any,
    @Body('jobDescription') jobDescription: string,
    @Body('jobTitle') jobTitle?: string,
    @Body('targetRole') targetRole?: string,
  ) {
    // Validate file
    if (!file) {
      throw new BadRequestException('فایل رزومه الزامی است. لطفاً یک فایل PDF یا TXT آپلود کنید.')
    }

    // Validate jobDescription
    const jd = (jobDescription ?? '').trim()
    if (jd.length < 30) {
      throw new BadRequestException('شرح موقعیت شغلی باید حداقل ۳۰ کاراکتر داشته باشد.')
    }

    // Extract text from uploaded file (throws 400 for scanned PDF, unsupported type, empty)
    const extractedText = await this.checkerService.extractResumeTextFromFile(
      file.buffer as Buffer,
      file.mimetype as string,
      file.originalname as string,
    )

    // Build DTO for the job match service
    const dto: CreateJobMatchDto = new CreateJobMatchDto()
    dto.resumeText = extractedText
    dto.sourceType = 'UPLOADED_FILE'
    dto.sourceFileName = file.originalname as string
    dto.jobDescription = jd
    dto.jobTitle = (jobTitle ?? '').trim() || undefined
    dto.targetRole = (targetRole ?? '').trim() || undefined

    const profile = await this.careerService.getOrCreateCareerProfile(user.id)
    return this.careerService.createJobMatch(user.id, profile.id, dto)
  }
}
