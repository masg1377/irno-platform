import { Injectable, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { promises as fs } from 'fs'
import * as path from 'path'
import { PrismaService } from '../prisma/prisma.service'
import { CareerPdfService, PdfQueueFullError, PdfTimeoutError, PdfDisabledError } from './career-pdf.service'
import type { CreateExportDto } from './dto/create-export.dto'

/**
 * CareerExportService — generates resume export records.
 *
 * Supported formats:
 *  - HTML: production-quality HTML snapshot with print CSS (instant)
 *  - PDF:  server-side PDF via Playwright Chromium (5–15 seconds)
 *
 * Storage:
 *  - HTML: stored as htmlSnapshot TEXT in the database
 *  - PDF:  written to EXPORT_STORAGE_PATH/{userId}/{exportId}.pdf
 *           default: {cwd}/storage/exports/{userId}/{exportId}.pdf
 *           fileUrl DB field stores relative path: {userId}/{exportId}.pdf
 *
 * Section content schemas (aligned with editor):
 *  - SUMMARY/TEXT_BLOCK/CUSTOM: { text: string }
 *  - EXPERIENCE/EDUCATION/PROJECT/CERTIFICATE/LANGUAGE/LINK: { items: [...] }
 *  - SKILL: { groups: [{ label, skills }] } or { skills: [...] }
 *
 * Watermark:
 *  - position: fixed; inset: 0 — appears on every page in PDF
 *  - 90px font-weight:900 at 7% opacity, rotated -35deg
 *  - aria-hidden — not parsed by ATS systems
 */
@Injectable()
export class CareerExportService {
  private readonly logger = new Logger(CareerExportService.name)

  private get db() {
    return this.prisma as any
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly careerPdfService: CareerPdfService,
  ) {}

  // ── Storage helpers ────────────────────────────────────────────────────────

  private getStorageBase(): string {
    return process.env['EXPORT_STORAGE_PATH'] ?? path.join(process.cwd(), 'storage', 'exports')
  }

  private buildAbsolutePdfPath(userId: string, exportId: string): string {
    const base = this.getStorageBase()
    const file = path.join(base, userId, `${exportId}.pdf`)
    // Validate resolved path is within base (path traversal prevention)
    const resolvedFile = path.resolve(file)
    const resolvedBase = path.resolve(base)
    if (!resolvedFile.startsWith(resolvedBase + path.sep) && resolvedFile !== resolvedBase) {
      throw new Error('Invalid storage path')
    }
    return resolvedFile
  }

  private buildRelativePdfPath(userId: string, exportId: string): string {
    return `${userId}/${exportId}.pdf`
  }

  private resolveAbsoluteFromRelative(relativePath: string): string {
    const base = this.getStorageBase()
    const file = path.join(base, relativePath)
    const resolvedFile = path.resolve(file)
    const resolvedBase = path.resolve(base)
    if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
      throw new Error('Invalid storage path')
    }
    return resolvedFile
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async triggerExport(resumeId: string, userId: string, dto: CreateExportDto) {
    const { resume } = await this.resolveResumeOwnership(resumeId, userId)

    const includeWatermark = dto.includeWatermark ?? (resume as any).includeWatermark ?? true
    const format: 'HTML' | 'PDF' = dto.format ?? 'HTML'

    // Fast-fail for disabled PDF before creating a DB record
    if (format === 'PDF' && !this.careerPdfService.isEnabled()) {
      throw new HttpException(
        'خروجی PDF در حال حاضر غیرفعال است. لطفاً از خروجی HTML استفاده کنید.',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    // Resolve template for styling
    const templateId = dto.templateOverrideId ?? (resume as any).templateId ?? null
    let template: any = null
    if (templateId) {
      template = await this.db.resumeTemplate.findUnique({ where: { id: templateId } })
    }

    // Create PENDING export record
    const exportRecord = await this.db.resumeExport.create({
      data: {
        resumeDocumentId: resumeId,
        userId,
        templateId,
        format,
        status: 'PENDING',
        includeWatermark,
        watermarkConfig: {
          type: 'DIAGONAL_BACKGROUND',
          text: 'ایرنو CV',
          opacity: 0.07,
        },
      },
    })

    // Generate HTML snapshot (used by both HTML and PDF paths)
    try {
      const htmlSnapshot = this.generateHtmlSnapshot(resume, template, includeWatermark)

      if (format === 'PDF') {
        // ── PDF path ─────────────────────────────────────────────────────
        const pdfBuffer = await this.careerPdfService.generatePdf(htmlSnapshot)

        // Write PDF to storage directory
        const absPath = this.buildAbsolutePdfPath(userId, exportRecord.id)
        await fs.mkdir(path.dirname(absPath), { recursive: true })
        await fs.writeFile(absPath, pdfBuffer)

        const relativePath = this.buildRelativePdfPath(userId, exportRecord.id)

        const updated = await this.db.resumeExport.update({
          where: { id: exportRecord.id },
          data: {
            status: 'GENERATED',
            htmlSnapshot,  // keep HTML as source for re-generation
            fileUrl: relativePath,
            generatedAt: new Date(),
          },
        })

        this.logger.log(`PDF export ${exportRecord.id} generated (${pdfBuffer.length} bytes)`)
        return this.mapExport(updated)
      } else {
        // ── HTML path ─────────────────────────────────────────────────────
        const updated = await this.db.resumeExport.update({
          where: { id: exportRecord.id },
          data: {
            status: 'GENERATED',
            htmlSnapshot,
            generatedAt: new Date(),
          },
        })
        return this.mapExport(updated)
      }
    } catch (err: any) {
      // Map well-known PDF errors to Persian messages and HTTP status codes
      let persianMessage: string
      let httpStatus: number

      if (err instanceof PdfQueueFullError) {
        persianMessage = 'در حال حاضر چند خروجی PDF در حال آماده‌سازی است. لطفاً چند لحظه دیگر دوباره تلاش کنید.'
        httpStatus = HttpStatus.TOO_MANY_REQUESTS
      } else if (err instanceof PdfTimeoutError) {
        persianMessage = 'تولید PDF بیش از حد مجاز طول کشید. لطفاً دوباره تلاش کنید.'
        httpStatus = HttpStatus.GATEWAY_TIMEOUT
      } else if (err instanceof PdfDisabledError) {
        persianMessage = 'خروجی PDF در حال حاضر غیرفعال است. لطفاً از خروجی HTML استفاده کنید.'
        httpStatus = HttpStatus.SERVICE_UNAVAILABLE
      } else {
        persianMessage = err?.message ?? 'خطا در تولید فایل'
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR
      }

      // Always persist FAILED status so history shows the correct state
      await this.db.resumeExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: persianMessage,
        },
      }).catch(() => {/* ignore secondary DB error */})

      // Re-throw as an HttpException so NestJS returns the right status code
      throw new HttpException(persianMessage, httpStatus)
    }
  }

  async listExports(resumeId: string, userId: string) {
    await this.resolveResumeOwnership(resumeId, userId)

    const exports = await this.db.resumeExport.findMany({
      where: { resumeDocumentId: resumeId, userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      // Exclude htmlSnapshot — can be hundreds of KB per export; not needed for list view
      select: {
        id: true, resumeDocumentId: true, userId: true,
        format: true, status: true, fileUrl: true,
        errorMessage: true, createdAt: true, updatedAt: true,
        templateId: true,
        // watermarkConfig is small JSON — safe to include
        watermarkConfig: true,
        // NOTE: htmlSnapshot intentionally excluded from list
      },
    })
    return exports.map((e: any) => this.mapExport(e))
  }

  async getExport(resumeId: string, exportId: string, userId: string) {
    await this.resolveResumeOwnership(resumeId, userId)

    const exportRecord = await this.db.resumeExport.findFirst({
      where: { id: exportId, resumeDocumentId: resumeId, userId },
    })
    if (!exportRecord) throw new NotFoundException('خروجی یافت نشد')
    return this.mapExport(exportRecord)
  }

  async downloadExport(resumeId: string, exportId: string, userId: string) {
    await this.resolveResumeOwnership(resumeId, userId)

    const exportRecord = await this.db.resumeExport.findFirst({
      where: { id: exportId, resumeDocumentId: resumeId, userId, status: 'GENERATED' },
    })
    if (!exportRecord) throw new NotFoundException('خروجی یافت نشد یا هنوز آماده نشده است')

    const resumeSlug = resumeId.slice(0, 8)
    const exportSlug = exportId.slice(0, 8)

    if (exportRecord.format === 'PDF') {
      if (!exportRecord.fileUrl) throw new NotFoundException('فایل PDF موجود نیست')
      const absPath = this.resolveAbsoluteFromRelative(exportRecord.fileUrl as string)
      const buffer = await fs.readFile(absPath)
      return {
        format: 'PDF' as const,
        buffer,
        filename: `irno-cv-${resumeSlug}-${exportSlug}.pdf`,
      }
    } else {
      if (!exportRecord.htmlSnapshot) throw new NotFoundException('محتوای خروجی موجود نیست')
      return {
        format: 'HTML' as const,
        html: exportRecord.htmlSnapshot as string,
        filename: `irno-cv-${resumeSlug}-${exportSlug}.html`,
      }
    }
  }

  /**
   * Returns the PDF buffer for a public profile download.
   * Used by the public download endpoint.
   *
   * @param resumeId  ID of the PUBLIC_LINK resume
   * @returns PDF buffer and filename, or null if no generated PDF exists
   */
  async getLatestPublicPdf(resumeId: string): Promise<{ buffer: Buffer; filename: string } | null> {
    const exportRecord = await this.db.resumeExport.findFirst({
      where: { resumeDocumentId: resumeId, format: 'PDF', status: 'GENERATED' },
      orderBy: { generatedAt: 'desc' },
    })
    if (!exportRecord?.fileUrl) return null

    try {
      const absPath = this.resolveAbsoluteFromRelative(exportRecord.fileUrl as string)
      const buffer = await fs.readFile(absPath)
      return { buffer, filename: `irno-cv-${resumeId.slice(0, 8)}.pdf` }
    } catch {
      // File may have been cleaned up; return null to fall back gracefully
      return null
    }
  }

  /**
   * Returns the latest generated PDF for a public profile.
   * Used by GET /api/v1/career/public/:slug/resume/download.
   *
   * Security:
   *  - Profile must be PUBLIC_LINK (not PRIVATE/DISABLED)
   *  - Resume must be PUBLIC_LINK visibility
   *  - allowPdfDownload must be true
   *  - Only GENERATED exports are served
   */
  async getPublicResumeDownload(slug: string): Promise<{ buffer: Buffer; filename: string }> {
    const profile = await this.db.careerProfile.findFirst({
      where: { publicSlug: slug },
    })
    if (!profile) throw new NotFoundException('پروفایل یافت نشد')
    if (profile.visibility === 'PRIVATE' || profile.visibility === 'DISABLED') {
      throw new NotFoundException('این پروفایل عمومی نیست')
    }

    const resume = await this.db.resumeDocument.findFirst({
      where: {
        careerProfileId: profile.id,
        visibility: 'PUBLIC_LINK',
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    })
    if (!resume) throw new NotFoundException('رزومه عمومی یافت نشد')

    const allowDownload = resume.allowPdfDownload ?? true
    if (!allowDownload) throw new NotFoundException('دانلود PDF برای این رزومه غیرفعال است')

    const pdfExport = await this.db.resumeExport.findFirst({
      where: { resumeDocumentId: resume.id, format: 'PDF', status: 'GENERATED' },
      orderBy: { generatedAt: 'desc' },
    })
    if (!pdfExport?.fileUrl) {
      throw new NotFoundException('هیچ PDF آماده‌ای برای این رزومه وجود ندارد')
    }

    const absPath = this.resolveAbsoluteFromRelative(pdfExport.fileUrl as string)
    const buffer = await fs.readFile(absPath)
    const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-').slice(0, 40)
    return { buffer, filename: `irno-cv-${safeSlug}.pdf` }
  }

  /**
   * Checks whether at least one generated PDF export exists for a resume.
   * Used to populate hasPdfExport in public profile response.
   */
  async hasGeneratedPdf(resumeId: string): Promise<boolean> {
    const exportRecord = await this.db.resumeExport.findFirst({
      where: { resumeDocumentId: resumeId, format: 'PDF', status: 'GENERATED' },
      select: { id: true },
    })
    return !!exportRecord
  }

  // ── Ownership helper ───────────────────────────────────────────────────────

  private async resolveResumeOwnership(resumeId: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id: resumeId, careerProfileId: profile.id, deletedAt: null },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')
    return { resume, profile }
  }

  // ── HTML generation ────────────────────────────────────────────────────────

  /**
   * Generates a production-quality HTML document suitable for:
   *  - Browser viewing
   *  - Playwright PDF generation (printBackground:true)
   *  - Ctrl+P / Save as PDF (print CSS included)
   *  - ATS if using ATS_FRIENDLY template
   *
   * Watermark: position:fixed — repeats on every page in Playwright PDF output.
   */
  private generateHtmlSnapshot(resume: any, template: any | null, includeWatermark: boolean): string {
    const sections: any[] = resume.sections ?? []
    const language: string = resume.language ?? 'FA'
    const dir = language === 'EN' ? 'ltr' : 'rtl'
    const isRtl = dir === 'rtl'

    const templateType: string = template?.type ?? 'ATS_FRIENDLY'
    const styleConfig: any = resume.styleConfig ?? {}
    // Sanitize accentColor to prevent CSS injection — user-supplied value
    const accentColor: string = this.safeCssColor(styleConfig.accentColor ?? this.defaultAccentColor(templateType))
    const fontSize: string = styleConfig.fontSize ?? 'normal'
    const spacing: string = styleConfig.spacing ?? 'normal'

    const fontSizePx = fontSize === 'small' ? '13px' : fontSize === 'large' ? '16px' : '14px'
    const sectionGap = spacing === 'compact' ? '16px' : spacing === 'comfortable' ? '32px' : '24px'
    const bodyPadding = spacing === 'compact' ? '24px 32px' : spacing === 'comfortable' ? '48px 56px' : '36px 48px'

    const watermarkText: string = (resume.watermarkConfig as any)?.text ?? 'ایرنو CV'

    const sectionsHtml = sections
      .map((s: any) => this.renderSection(s, isRtl, accentColor))
      .join('\n')

    // Watermark uses position:fixed so it repeats on every PDF page.
    // aria-hidden ensures it is not parsed by ATS systems (CSS-only, no text nodes exposed).
    const watermarkBlock = includeWatermark
      ? `<div aria-hidden="true" style="
          position:fixed;
          top:0;left:0;right:0;bottom:0;
          width:100%;height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:none;
          z-index:9999;
          overflow:hidden;
          background:transparent;
        ">
          <div style="
            font-size:120px;
            font-weight:900;
            color:rgba(0,0,0,0.08);
            white-space:nowrap;
            transform:rotate(-35deg);
            user-select:none;
            letter-spacing:0.05em;
            opacity:1;
          ">${this.escapeHtml(watermarkText)}</div>
        </div>`
      : ''

    return `<!DOCTYPE html>
<html lang="${language === 'EN' ? 'en' : 'fa'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(resume.title ?? 'رزومه')} — ایرنو CV</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${isRtl ? "'Vazirmatn', Tahoma" : "'Inter', system-ui"}, Arial, sans-serif;
      font-size: ${fontSizePx};
      line-height: 1.7;
      color: #1a1a2e;
      background: #fff;
      direction: ${dir};
    }

    /* ── Page wrapper ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      max-width: 100%;
      margin: 0 auto;
      padding: ${bodyPadding};
      background: #fff;
      position: relative;
    }

    /* ── Content layer (above watermark) ── */
    .content {
      position: relative;
      z-index: 1;
    }

    /* ── Header ── */
    .resume-name {
      font-size: 26px;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 4px;
      letter-spacing: ${isRtl ? 'normal' : '-0.02em'};
    }
    .resume-target-role {
      font-size: 15px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .resume-contact {
      font-size: 12px;
      color: #64748b;
      margin-bottom: ${sectionGap};
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .resume-contact a { color: inherit; text-decoration: none; }

    /* ── Sections ── */
    .section {
      margin-bottom: ${sectionGap};
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 4px;
      margin-bottom: 12px;
    }
    ${this.getTemplateExtraCss(templateType, accentColor, isRtl)}

    /* ── Experience / Project items ── */
    .item { margin-bottom: 14px; }
    .item:last-child { margin-bottom: 0; }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .item-title { font-weight: 600; font-size: 14px; color: #111827; }
    .item-meta { font-size: 12px; color: #6b7280; white-space: nowrap; }
    .item-subtitle { font-size: 13px; color: #374151; margin-bottom: 4px; }
    .item-desc { font-size: 13px; color: #4b5563; margin-top: 4px; line-height: 1.6; }
    .item-bullets {
      list-style: none;
      padding: 0;
      margin: 6px 0 0;
    }
    .item-bullets li {
      font-size: 13px;
      color: #374151;
      padding-${isRtl ? 'right' : 'left'}: 14px;
      position: relative;
      margin-bottom: 3px;
    }
    .item-bullets li::before {
      content: '•';
      position: absolute;
      ${isRtl ? 'right' : 'left'}: 0;
      color: ${accentColor};
    }
    .tech-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .tech-tag {
      font-size: 11px;
      background: ${accentColor}18;
      color: ${accentColor};
      border-radius: 4px;
      padding: 1px 6px;
    }

    /* ── Skills ── */
    .skill-groups { display: flex; flex-direction: column; gap: 8px; }
    .skill-group-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px; }
    .skill-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-chip {
      font-size: 12px;
      background: #f3f4f6;
      color: #374151;
      border-radius: 6px;
      padding: 3px 10px;
      border: 1px solid #e5e7eb;
    }

    /* ── Language ── */
    .lang-items { display: flex; flex-wrap: wrap; gap: 12px; }
    .lang-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .lang-level { color: #6b7280; font-size: 12px; }

    /* ── Links ── */
    .link-list { list-style: none; padding: 0; }
    .link-list li { margin-bottom: 4px; }
    .link-list a { color: ${accentColor}; font-size: 13px; text-decoration: none; word-break: break-all; }

    /* ── Certificate ── */
    .cert-item { margin-bottom: 10px; }
    .cert-title { font-weight: 600; font-size: 13px; color: #111827; }
    .cert-meta { font-size: 12px; color: #6b7280; }

    /* ── Summary / text block ── */
    .text-content { font-size: 13px; color: #374151; line-height: 1.8; }

    /* ── Print / A4 ── */
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      body {
        background: white;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 20mm 18mm;
      }
      a { color: inherit !important; }
    }
  </style>
</head>
<body>
  ${watermarkBlock}
  <div class="page">
    <div class="content">
      <div class="resume-name">${this.escapeHtml(resume.title ?? 'رزومه')}</div>
      ${resume.targetRole ? `<div class="resume-target-role">${this.escapeHtml(resume.targetRole)}</div>` : ''}
      ${sectionsHtml}
    </div>
  </div>
</body>
</html>`
  }

  private getTemplateExtraCss(templateType: string, accentColor: string, isRtl: boolean): string {
    switch (templateType) {
      case 'MODERN_MINIMAL':
        return `
    .section-title { border-bottom: none; border-${isRtl ? 'right' : 'left'}: 3px solid ${accentColor}; padding-${isRtl ? 'right' : 'left'}: 8px; padding-bottom: 0; }
    .resume-name { font-weight: 300; letter-spacing: ${isRtl ? 'normal' : '0.1em'}; }`

      case 'TECHNICAL':
        return `
    .section-title { font-family: monospace; letter-spacing: 2px; }
    .tech-tag { font-family: monospace; font-size: 11px; background: #0f172a; color: #38bdf8; }`

      case 'ACADEMIC':
        return `
    .section-title { font-size: 14px; letter-spacing: normal; text-transform: none; border-bottom: 1px solid #374151; }
    .resume-name { font-size: 22px; }`

      default: // ATS_FRIENDLY
        return `/* ATS-friendly: clean, no decorative elements */`
    }
  }

  private renderSection(section: any, isRtl: boolean, accentColor: string): string {
    const title = this.escapeHtml(section.title ?? this.defaultSectionTitle(section.type))
    const content: any = section.content ?? {}

    let inner = ''

    switch (section.type) {
      case 'SUMMARY':
      case 'TEXT_BLOCK':
      case 'CUSTOM': {
        const text = content.text ?? ''
        inner = `<p class="text-content">${this.escapeHtml(text)}</p>`
        break
      }

      case 'EXPERIENCE': {
        const items: any[] = content.items ?? content.entries ?? []
        inner = items
          .map((e: any) => {
            const period = this.buildPeriod(e.startDate, e.endDate, e.isCurrent, isRtl)
            const achievements: string[] = e.achievements ?? e.bullets ?? []
            const technologies: string[] = e.technologies ?? []
            return `<div class="item">
              <div class="item-header">
                <span class="item-title">${this.escapeHtml(e.role ?? e.title ?? '')}</span>
                ${period ? `<span class="item-meta">${period}</span>` : ''}
              </div>
              ${e.company ? `<div class="item-subtitle">${this.escapeHtml(e.company)}${e.location ? ` · ${this.escapeHtml(e.location)}` : ''}</div>` : ''}
              ${e.description ? `<p class="item-desc">${this.escapeHtml(e.description)}</p>` : ''}
              ${achievements.length > 0 ? `<ul class="item-bullets">${achievements.map((b: string) => `<li>${this.escapeHtml(String(b))}</li>`).join('')}</ul>` : ''}
              ${technologies.length > 0 ? `<div class="tech-tags">${technologies.map((t: string) => `<span class="tech-tag">${this.escapeHtml(t)}</span>`).join('')}</div>` : ''}
            </div>`
          })
          .join('')
        break
      }

      case 'EDUCATION': {
        const items: any[] = content.items ?? content.entries ?? []
        inner = items
          .map((e: any) => {
            const period = this.buildPeriod(e.startDate, e.endDate, false, isRtl)
            return `<div class="item">
              <div class="item-header">
                <span class="item-title">${this.escapeHtml(e.institution ?? '')}</span>
                ${period ? `<span class="item-meta">${period}</span>` : ''}
              </div>
              <div class="item-subtitle">${this.escapeHtml(e.degree ?? '')}${e.field ? ` — ${this.escapeHtml(e.field)}` : ''}</div>
              ${e.gpa ? `<div class="item-desc">GPA: ${this.escapeHtml(String(e.gpa))}</div>` : ''}
            </div>`
          })
          .join('')
        break
      }

      case 'SKILL': {
        const groups: any[] = content.groups ?? []
        if (groups.length === 0) {
          const flat: string[] = content.skills ?? []
          inner = `<div class="skill-chips">${flat.map((s: string) => `<span class="skill-chip">${this.escapeHtml(s)}</span>`).join('')}</div>`
        } else {
          inner = `<div class="skill-groups">${groups
            .map((g: any) => {
              const skills: string[] = g.skills ?? []
              return `<div>
                ${g.label ? `<div class="skill-group-label">${this.escapeHtml(g.label)}</div>` : ''}
                <div class="skill-chips">${skills.map((s: string) => `<span class="skill-chip">${this.escapeHtml(String(s))}</span>`).join('')}</div>
              </div>`
            })
            .join('')}</div>`
        }
        break
      }

      case 'PROJECT': {
        const items: any[] = content.items ?? []
        inner = items
          .map((p: any) => {
            const period = this.buildPeriod(p.startDate, p.endDate, false, isRtl)
            const technologies: string[] = p.technologies ?? []
            const links: string[] = []
            if (p.demoUrl) links.push(`<a href="${this.safeUrl(p.demoUrl)}">Demo</a>`)
            if (p.repoUrl) links.push(`<a href="${this.safeUrl(p.repoUrl)}">Repo</a>`)
            return `<div class="item">
              <div class="item-header">
                <span class="item-title">${this.escapeHtml(p.title ?? '')}</span>
                ${period ? `<span class="item-meta">${period}</span>` : ''}
              </div>
              ${p.role ? `<div class="item-subtitle">${this.escapeHtml(p.role)}</div>` : ''}
              ${p.description ? `<p class="item-desc">${this.escapeHtml(p.description)}</p>` : ''}
              ${technologies.length > 0 ? `<div class="tech-tags">${technologies.map((t: string) => `<span class="tech-tag">${this.escapeHtml(t)}</span>`).join('')}</div>` : ''}
              ${links.length > 0 ? `<div style="font-size:12px;margin-top:4px;">${links.join(' · ')}</div>` : ''}
            </div>`
          })
          .join('')
        break
      }

      case 'CERTIFICATE': {
        const items: any[] = content.items ?? content.certificates ?? []
        inner = items
          .map((c: any) => `<div class="cert-item">
            <div class="cert-title">${this.escapeHtml(c.title ?? '')}</div>
            <div class="cert-meta">${c.issuer ? this.escapeHtml(c.issuer) : ''}${c.issuedAt ? ` · ${this.escapeHtml(c.issuedAt)}` : ''}${c.credentialId ? ` · شناسه: ${this.escapeHtml(c.credentialId)}` : ''}</div>
            ${c.verificationUrl ? `<div style="font-size:11px;margin-top:2px;"><a href="${this.safeUrl(c.verificationUrl)}" style="color:${this.escapeHtml(accentColor)};">تایید مدرک</a></div>` : ''}
          </div>`)
          .join('')
        break
      }

      case 'LANGUAGE': {
        const items: any[] = content.items ?? []
        inner = `<div class="lang-items">${items
          .map((l: any) => `<div class="lang-item">
            <span>${this.escapeHtml(l.language ?? '')}</span>
            ${l.level ? `<span class="lang-level">— ${this.escapeHtml(l.level)}</span>` : ''}
          </div>`)
          .join('')}</div>`
        break
      }

      case 'LINK': {
        const items: any[] = content.items ?? content.links ?? []
        inner = `<ul class="link-list">${items
          .map((l: any) => `<li><a href="${this.safeUrl(l.url)}">${this.escapeHtml(l.label ?? l.url ?? '')}</a></li>`)
          .join('')}</ul>`
        break
      }

      default:
        inner = content.text
          ? `<p class="text-content">${this.escapeHtml(content.text)}</p>`
          : `<p class="text-content" style="color:#9ca3af;font-style:italic;">بدون محتوا</p>`
    }

    if (!inner.trim()) return ''

    return `<div class="section">
  <div class="section-title">${title}</div>
  <div>${inner}</div>
</div>`
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildPeriod(
    startDate: string | undefined,
    endDate: string | undefined,
    isCurrent: boolean | undefined,
    isRtl: boolean,
  ): string {
    if (!startDate && !endDate) return ''
    const sep = isRtl ? ' تا ' : ' – '
    const end = isCurrent ? (isRtl ? 'اکنون' : 'Present') : endDate ?? ''
    return `${startDate ?? ''}${end ? sep + end : ''}`
  }

  private defaultAccentColor(templateType: string): string {
    const map: Record<string, string> = {
      ATS_FRIENDLY: '#1d4ed8',
      MODERN_MINIMAL: '#0f172a',
      TECHNICAL: '#0284c7',
      ACADEMIC: '#374151',
    }
    return map[templateType] ?? '#1d4ed8'
  }

  private defaultSectionTitle(type: string): string {
    const map: Record<string, string> = {
      SUMMARY: 'خلاصه حرفه‌ای',
      EXPERIENCE: 'سابقه کاری',
      EDUCATION: 'تحصیلات',
      SKILL: 'مهارت‌ها',
      PROJECT: 'پروژه‌ها',
      LANGUAGE: 'زبان‌ها',
      CERTIFICATE: 'مدارک',
      AWARD: 'دستاوردها',
      LINK: 'لینک‌ها',
      TEXT_BLOCK: '',
      CUSTOM: '',
    }
    return map[type] ?? type
  }

  private escapeHtml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Sanitize a CSS color value to prevent CSS injection.
   *
   * Only allows valid hex colors (#RGB or #RRGGBB) and a safe set of named colors.
   * Returns the default accent color if the value is invalid.
   *
   * Prevents CSS injection like: "red; } body { display:none }"
   */
  private safeCssColor(color: string | null | undefined): string {
    if (!color) return '#2563eb'
    const trimmed = String(color).trim()
    // Accept only: #RGB, #RRGGBB, #RRGGBBAA
    if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed
    // Accept safe named colors (small subset)
    const safeNamed = new Set(['black', 'white', 'red', 'blue', 'green', 'gray', 'navy', 'teal'])
    if (safeNamed.has(trimmed.toLowerCase())) return trimmed.toLowerCase()
    return '#2563eb'
  }

  /**
   * Sanitize a URL for use in href/src attributes.
   *
   * Strips javascript: and data: protocols which can execute code.
   * Only allows http:, https:, mailto:, and relative URLs.
   * Returns '#' for any disallowed or empty URL.
   */
  private safeUrl(url: string | null | undefined): string {
    if (!url) return '#'
    const trimmed = String(url).trim()
    // Allow only http, https, mailto, and relative paths
    if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) {
      return this.escapeHtml(trimmed)
    }
    // Block javascript:, data:, vbscript:, and anything else
    return '#'
  }

  private mapExport(e: any) {
    return {
      id: e.id,
      resumeDocumentId: e.resumeDocumentId,
      userId: e.userId,
      templateId: e.templateId ?? null,
      format: e.format,
      status: e.status,
      includeWatermark: e.includeWatermark,
      watermarkConfig: e.watermarkConfig ?? null,
      errorMessage: e.errorMessage ?? null,
      fileUrl: e.fileUrl ?? null,
      generatedAt: e.generatedAt ?? null,
      createdAt: e.createdAt,
    }
  }
}
