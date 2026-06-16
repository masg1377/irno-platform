/**
 * ResumeCheckerService — advanced rule-based resume quality analysis.
 *
 * Supports:
 *   1. Checking Irno-built resume documents (structured sections)
 *   2. Checking pasted plain text or uploaded file text
 *
 * Uses the rule engine in ./resume-checker/ for all analysis.
 * AI-powered analysis is future work; all checks are deterministic.
 *
 * Scores: ATS, HR Scan, Structure, Achievement, Keyword, Formatting,
 *         Completeness, Readability, RoleMatch (when JD provided), Overall.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { inflateSync, inflateRawSync } from 'zlib'

// ─── PDF CMap type ────────────────────────────────────────────────────────────
type CidToUnicode = Map<number, string>
import { PrismaService } from '../prisma/prisma.service'
import {
  runCheckerEngine,
  normaliseSections,
  sectionsToText,
} from './resume-checker/resume-checker-engine.js'
import type { RuleContext } from './resume-checker/types.js'

const MAX_TEXT_BYTES = 5_000_000 // 5 MB — PDFs can be large

@Injectable()
export class ResumeCheckerService {
  private readonly logger = new Logger(ResumeCheckerService.name)

  private get db() {
    return this.prisma as any
  }

  constructor(private readonly prisma: PrismaService) {}

  // ── Check Irno resume ──────────────────────────────────────────────────────

  async checkResume(
    resumeDocumentId: string,
    userId: string,
    opts?: { targetRole?: string; jobDescription?: string },
  ) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل کاری یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id: resumeDocumentId, careerProfileId: profile.id, deletedAt: null },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    const sections = normaliseSections(resume.sections ?? [])
    const fullText = sectionsToText(sections)

    const ctx: RuleContext = {
      sections,
      fullText,
      targetRole: opts?.targetRole ?? resume.targetRole ?? undefined,
      jobDescription: opts?.jobDescription,
      templateType: resume.templateId ?? undefined,
      styleConfig: resume.styleConfig as Record<string, unknown> | undefined,
      language: resume.language ?? undefined,
    }

    const { findings, suggestions, scores, keywordMatch, diagnostics } = runCheckerEngine(ctx)

    const report = await this.db.resumeCheckReport.create({
      data: {
        resumeDocumentId,
        userId,
        sourceType: 'IRNO_RESUME',
        targetRole: ctx.targetRole ?? null,
        jobDescriptionSnapshot: opts?.jobDescription ?? null,
        overallScore: scores.overallScore,
        atsScore: scores.atsScore,
        hrScanScore: scores.hrScanScore,
        structureScore: scores.structureScore,
        keywordScore: scores.keywordScore,
        achievementScore: scores.achievementScore,
        formattingRiskScore: scores.formattingRiskScore,
        completenessScore: scores.completenessScore,
        readabilityScore: scores.readabilityScore,
        roleMatchScore: scores.roleMatchScore ?? null,
        findings,
        suggestions,
      },
    })

    return this.mapReport(report, keywordMatch, diagnostics)
  }

  async listChecks(resumeDocumentId: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل کاری یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id: resumeDocumentId, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    const reports = await this.db.resumeCheckReport.findMany({
      where: { resumeDocumentId, userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return reports.map((r: any) => this.mapReportSummary(r))
  }

  async getCheck(checkId: string, userId: string) {
    const report = await this.db.resumeCheckReport.findFirst({
      where: { id: checkId, userId },
    })
    if (!report) throw new NotFoundException('گزارش بررسی یافت نشد')
    return this.mapReport(report, null)
  }

  // ── Check pasted text ──────────────────────────────────────────────────────

  async checkText(
    userId: string,
    opts: {
      resumeText: string
      targetRole?: string
      jobDescription?: string
      language?: 'FA' | 'EN' | 'FA_EN'
    },
  ) {
    const { resumeText, targetRole, jobDescription, language } = opts

    if (!resumeText || resumeText.trim().length < 30) {
      throw new BadRequestException('متن رزومه باید حداقل ۳۰ کاراکتر داشته باشد.')
    }
    if (Buffer.byteLength(resumeText, 'utf8') > MAX_TEXT_BYTES) {
      throw new PayloadTooLargeException('متن رزومه بیش از حد مجاز است (حداکثر ۲۰۰ کیلوبایت).')
    }

    const sanitised = sanitiseText(resumeText)

    const ctx: RuleContext = {
      sections: [],
      fullText: sanitised,
      targetRole,
      jobDescription,
      language,
    }

    const { findings, suggestions, scores, keywordMatch, diagnostics } = runCheckerEngine(ctx)

    const textSnapshot = sanitised.slice(0, 5000)

    const report = await this.db.resumeCheckReport.create({
      data: {
        resumeDocumentId: null,
        userId,
        sourceType: 'PASTED_TEXT',
        sourceTextSnapshot: textSnapshot,
        targetRole: targetRole ?? null,
        jobDescriptionSnapshot: jobDescription ?? null,
        overallScore: scores.overallScore,
        atsScore: scores.atsScore,
        hrScanScore: scores.hrScanScore,
        structureScore: scores.structureScore,
        keywordScore: scores.keywordScore,
        achievementScore: scores.achievementScore,
        formattingRiskScore: scores.formattingRiskScore,
        completenessScore: scores.completenessScore,
        readabilityScore: scores.readabilityScore,
        roleMatchScore: scores.roleMatchScore ?? null,
        findings,
        suggestions,
      },
    })

    return this.mapReport(report, keywordMatch, diagnostics)
  }

  // ── Check uploaded file ────────────────────────────────────────────────────

  async checkUploadedFile(
    userId: string,
    opts: {
      fileBuffer: Buffer
      mimeType: string
      originalName: string
      targetRole?: string
      jobDescription?: string
      language?: 'FA' | 'EN' | 'FA_EN'
    },
  ) {
    const { fileBuffer, mimeType, originalName, targetRole, jobDescription, language } = opts

    this.logger.debug(`Upload check: ${originalName}, size=${fileBuffer?.length ?? 0}, mime=${mimeType}`)

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('فایل دریافت نشد یا خالی است. لطفاً دوباره آپلود کنید.')
    }

    if (fileBuffer.length > MAX_TEXT_BYTES) {
      throw new PayloadTooLargeException('فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).')
    }

    let extractedText: string

    if (mimeType === 'text/plain' || originalName.toLowerCase().endsWith('.txt')) {
      extractedText = fileBuffer.toString('utf8')
    } else if (
      mimeType === 'application/pdf' ||
      originalName.toLowerCase().endsWith('.pdf')
    ) {
      extractedText = extractPdfText(fileBuffer, this.logger)
      this.logger.debug(`PDF extracted ${extractedText.length} chars from ${originalName}`)
      if (!extractedText || extractedText.trim().length < 30) {
        throw new BadRequestException(
          'متن رزومه از این PDF قابل استخراج نیست. ' +
          'لطفاً از PDF ای استفاده کنید که متن آن قابل انتخاب باشد (نه اسکن‌شده). ' +
          'یا متن رزومه را مستقیم در تب «چسباندن متن» وارد کنید.',
        )
      }
    } else {
      throw new BadRequestException(
        'فرمت فایل پشتیبانی نمی‌شود. لطفاً فایل TXT یا PDF ارسال کنید.',
      )
    }

    const sanitised = sanitiseText(extractedText)
    if (sanitised.trim().length < 30) {
      throw new BadRequestException(
        'محتوای فایل خیلی کوتاه است. مطمئن شوید فایل حاوی متن قابل خواندن است.',
      )
    }

    const ctx: RuleContext = {
      sections: [],
      fullText: sanitised,
      targetRole,
      jobDescription,
      language,
    }

    const { findings, suggestions, scores, keywordMatch, diagnostics } = runCheckerEngine(ctx)

    const textSnapshot = sanitised.slice(0, 5000)

    const report = await this.db.resumeCheckReport.create({
      data: {
        resumeDocumentId: null,
        userId,
        sourceType: 'UPLOADED_FILE',
        sourceFileName: originalName.slice(0, 255),
        sourceTextSnapshot: textSnapshot,
        targetRole: targetRole ?? null,
        jobDescriptionSnapshot: jobDescription ?? null,
        overallScore: scores.overallScore,
        atsScore: scores.atsScore,
        hrScanScore: scores.hrScanScore,
        structureScore: scores.structureScore,
        keywordScore: scores.keywordScore,
        achievementScore: scores.achievementScore,
        formattingRiskScore: scores.formattingRiskScore,
        completenessScore: scores.completenessScore,
        readabilityScore: scores.readabilityScore,
        roleMatchScore: scores.roleMatchScore ?? null,
        findings,
        suggestions,
      },
    })

    return this.mapReport(report, keywordMatch, diagnostics)
  }

  // ── List all user check reports ────────────────────────────────────────────

  async listReports(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [reports, total] = await Promise.all([
      this.db.resumeCheckReport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.db.resumeCheckReport.count({ where: { userId } }),
    ])

    return {
      data: reports.map((r: any) => this.mapReportSummary(r)),
      total,
      page,
      pageSize,
    }
  }

  async getReport(reportId: string, userId: string) {
    const report = await this.db.resumeCheckReport.findFirst({
      where: { id: reportId, userId },
    })
    if (!report) throw new NotFoundException('گزارش بررسی یافت نشد')
    return this.mapReport(report, null)
  }

  // ── Mapping helpers ────────────────────────────────────────────────────────

  private mapReport(r: any, keywordMatch: any, diagnostics?: any) {
    return {
      id: r.id,
      resumeDocumentId: r.resumeDocumentId ?? null,
      userId: r.userId,
      sourceType: r.sourceType,
      sourceFileName: r.sourceFileName ?? null,
      targetRole: r.targetRole ?? null,
      overallScore: r.overallScore,
      atsScore: r.atsScore,
      hrScanScore: r.hrScanScore,
      structureScore: r.structureScore,
      keywordScore: r.keywordScore,
      achievementScore: r.achievementScore,
      formattingRiskScore: r.formattingRiskScore,
      completenessScore: r.completenessScore,
      readabilityScore: r.readabilityScore ?? 0,
      roleMatchScore: r.roleMatchScore ?? null,
      findings: Array.isArray(r.findings) ? r.findings : [],
      suggestions: Array.isArray(r.suggestions) ? r.suggestions : [],
      keywordMatch: keywordMatch ?? null,
      diagnostics: diagnostics ?? null,
      createdAt: r.createdAt,
    }
  }

  private mapReportSummary(r: any) {
    const findings: any[] = Array.isArray(r.findings) ? r.findings : []
    return {
      id: r.id,
      resumeDocumentId: r.resumeDocumentId ?? null,
      sourceType: r.sourceType,
      sourceFileName: r.sourceFileName ?? null,
      targetRole: r.targetRole ?? null,
      overallScore: r.overallScore,
      atsScore: r.atsScore,
      completenessScore: r.completenessScore,
      findingCount: findings.length,
      criticalCount: findings.filter((f: any) => f.severity === 'CRITICAL').length,
      createdAt: r.createdAt,
    }
  }

  // ── Public extraction API (used by Job Match for external resumes) ──────────

  /**
   * Extract and sanitise plain text from an uploaded resume file.
   * Used by Job Match to process external resumes before keyword analysis.
   *
   * Supported formats: PDF (selectable text only), TXT
   * Throws BadRequestException with a Persian message if:
   *  - File is empty or too large
   *  - File type is not supported
   *  - PDF has no selectable text (scanned/image PDF)
   *  - Extracted text is too short to be useful
   */
  public async extractResumeTextFromFile(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('فایل دریافت نشد یا خالی است. لطفاً دوباره آپلود کنید.')
    }
    if (fileBuffer.length > MAX_TEXT_BYTES) {
      throw new PayloadTooLargeException('فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).')
    }

    let extracted: string

    if (mimeType === 'text/plain' || originalName.toLowerCase().endsWith('.txt')) {
      extracted = fileBuffer.toString('utf8')
    } else if (
      mimeType === 'application/pdf' ||
      originalName.toLowerCase().endsWith('.pdf')
    ) {
      try {
        // pdf-parse@2.x uses a class-based API: new PDFParse({data}).getText()
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Uint8Array }) => { getText(): Promise<{ text: string }>; destroy(): Promise<void> } }
        const parser = new PDFParse({ data: new Uint8Array(fileBuffer) })
        try {
          const result = await parser.getText()
          extracted = result.text ?? ''
          this.logger.debug(`pdf-parse extracted ${extracted.length} chars from ${originalName}`)
        } finally {
          await parser.destroy().catch(() => { /* ignore */ })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.warn(`pdf-parse failed for ${originalName}: ${msg}`)
        extracted = ''
      }

      if (!extracted || extracted.trim().length < 30) {
        throw new BadRequestException(
          'متن رزومه از این PDF قابل استخراج نیست. ' +
          'لطفاً از PDF ای استفاده کنید که متن آن قابل انتخاب باشد (نه اسکن‌شده). ' +
          'یا متن رزومه را مستقیم در تب «چسباندن متن» وارد کنید.',
        )
      }
    } else {
      throw new BadRequestException(
        'فرمت فایل پشتیبانی نمی‌شود. لطفاً فایل PDF یا TXT ارسال کنید.',
      )
    }

    const sanitised = sanitiseText(extracted)
    if (sanitised.trim().length < 30) {
      throw new BadRequestException(
        'محتوای فایل خیلی کوتاه است. مطمئن شوید فایل حاوی متن قابل خواندن است.',
      )
    }
    return sanitised
  }

  /**
   * Sanitise and validate resume text pasted directly by the user.
   * Throws BadRequestException with a Persian message if too short or too large.
   */
  public sanitiseResumeText(resumeText: string): string {
    if (!resumeText || resumeText.trim().length < 30) {
      throw new BadRequestException('متن رزومه باید حداقل ۳۰ کاراکتر داشته باشد.')
    }
    if (Buffer.byteLength(resumeText, 'utf8') > MAX_TEXT_BYTES) {
      throw new PayloadTooLargeException('متن رزومه بیش از حد مجاز است (حداکثر ۵ مگابایت).')
    }
    return sanitiseText(resumeText)
  }
}

// ── Utility functions ──────────────────────────────────────────────────────

function sanitiseText(raw: string): string {
  return raw
    // Remove null bytes and control characters (except newlines and tabs)
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ' ')
    // Normalise line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix PDF-artifact broken words: "Reac t" → "React", "Deve loper" → "Developer"
    // Only glue when the suffix looks like a broken fragment — never merge common English words.
    .replace(/([a-zA-Z]{2,})\s([a-z]{1,3}\b)/g, (match, a, b) => {
      // Preserve common short English words — these are NEVER broken fragments.
      // Merging "University of" → "Universityof" breaks pattern detection.
      const PRESERVE = new Set([
        'of', 'in', 'to', 'at', 'by', 'or', 'an', 'as', 'be', 'is', 'it',
        'do', 'so', 'no', 'up', 'us', 'my', 'we', 'he', 'me', 'if', 'on',
        'am', 'go', 'oh', 'ok', 'vs', 'et', 'eg', 'ie', 're', 'mr', 'dr',
        'jr', 'sr', 'st', 'ms', 'co',
      ])
      if (PRESERVE.has(b)) return match
      // Only merge if the suffix is very short (1-2 chars) and looks like a broken fragment
      if (b.length <= 2 && /^[a-z]/.test(b)) return a + b
      return match
    })
    // Remove repeated whitespace on each line, preserve blank lines between sections
    .replace(/[ \t]+/g, ' ')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove lines that are only punctuation or control chars (PDF artifacts)
    .split('\n')
    .map((l) => (/^[\s\-_.,:;|#*~`]+$/.test(l.trim()) && l.trim().length > 0 ? '' : l))
    .join('\n')
    .trim()
}

/**
 * Decompress a single PDF stream buffer. Returns empty string on failure.
 */
function decompressStream(streamData: Buffer, hasFlate: boolean): string {
  if (hasFlate && streamData.length > 0) {
    try { return inflateSync(streamData).toString('latin1') } catch { /* fall through */ }
    try { return inflateRawSync(streamData).toString('latin1') } catch { /* skip */ }
    return ''
  }
  return streamData.toString('latin1')
}

/**
 * Walk every stream in the PDF buffer, calling the visitor for each.
 * visitor receives: (content, dictSlice, hasFlate)
 */
function walkPdfStreams(
  buf: Buffer,
  visitor: (content: string, dictSlice: string, hasFlate: boolean) => void,
): void {
  const STREAM_KW = Buffer.from('stream')
  const ENDSTREAM_KW = Buffer.from('endstream')
  let pos = 0

  while (pos < buf.length - 20) {
    const sIdx = buf.indexOf(STREAM_KW, pos)
    if (sIdx < 0) break

    const afterKw = sIdx + 6
    let dataStart: number
    if (buf[afterKw] === 0x0d && buf[afterKw + 1] === 0x0a) {
      dataStart = afterKw + 2
    } else if (buf[afterKw] === 0x0a) {
      dataStart = afterKw + 1
    } else {
      pos = sIdx + 6
      continue
    }

    const eIdx = buf.indexOf(ENDSTREAM_KW, dataStart)
    if (eIdx < 0) break

    const dictSlice = buf.slice(Math.max(0, sIdx - 800), sIdx).toString('latin1')
    const hasFlate = /\/FlateDecode\b/i.test(dictSlice)
    const content = decompressStream(buf.slice(dataStart, eIdx), hasFlate)
    if (content) visitor(content, dictSlice, hasFlate)

    pos = eIdx + 9
  }
}

/**
 * Parse a ToUnicode CMap stream body into a CID→Unicode map.
 *
 * Handles:
 *   beginbfchar  <src_hex> <dst_hex>  endbfchar
 *   beginbfrange <lo_hex> <hi_hex> <base_hex>  endbfrange
 *   beginbfrange <lo_hex> <hi_hex> [<u1> <u2> …]  endbfrange
 */
function parseCMap(content: string): CidToUnicode {
  const map: CidToUnicode = new Map()

  // ── beginbfchar section ──────────────────────────────────────────────────
  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g
  let m: RegExpExecArray | null
  while ((m = bfcharRe.exec(content)) !== null) {
    const body = m[1]
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g
    let p: RegExpExecArray | null
    while ((p = pairRe.exec(body)) !== null) {
      const src = parseInt(p[1], 16)
      const dst = parseInt(p[2], 16)
      if (!isNaN(src) && !isNaN(dst)) map.set(src, String.fromCodePoint(dst))
    }
  }

  // ── beginbfrange section ─────────────────────────────────────────────────
  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g
  while ((m = bfrangeRe.exec(content)) !== null) {
    const body = m[1]
    // Each entry: <lo> <hi> <base_hex>  OR  <lo> <hi> [<u1> <u2> …]
    const entryRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g
    let e: RegExpExecArray | null
    while ((e = entryRe.exec(body)) !== null) {
      const lo = parseInt(e[1], 16)
      const hi = parseInt(e[2], 16)
      if (isNaN(lo) || isNaN(hi)) continue

      if (e[4] !== undefined) {
        // Scalar base: each CID in [lo..hi] maps to sequential Unicode codepoints
        const base = parseInt(e[4], 16)
        if (!isNaN(base)) {
          for (let cid = lo; cid <= hi; cid++) map.set(cid, String.fromCodePoint(base + (cid - lo)))
        }
      } else if (e[5] !== undefined) {
        // Array: each CID maps to the corresponding hex in the array
        const hexes = e[5].match(/<([0-9a-fA-F]+)>/g) ?? []
        for (let i = 0; i < hexes.length && lo + i <= hi; i++) {
          const cp = parseInt(hexes[i].slice(1, -1), 16)
          if (!isNaN(cp)) map.set(lo + i, String.fromCodePoint(cp))
        }
      }
    }
  }

  return map
}

/**
 * Collect all ToUnicode CMaps from the PDF into a single combined map.
 * CIDFont PDFs encode each character as 2 bytes; the CMap maps those 2-byte
 * CIDs to Unicode codepoints.
 *
 * Merge rule: an existing non-PUA mapping is never overwritten by a PUA mapping.
 * Private Use Area (U+E000–U+F8FF) chars are visual glyphs (bullets, icons,
 * ligatures) that have no standard text value; they would corrupt extracted text.
 */
function collectCMaps(buf: Buffer): CidToUnicode {
  const combined: CidToUnicode = new Map()

  const isPua = (s: string): boolean => {
    const cp = s.codePointAt(0) ?? 0
    return cp >= 0xe000 && cp <= 0xf8ff
  }

  walkPdfStreams(buf, (content) => {
    if (content.includes('beginbfchar') || content.includes('beginbfrange')) {
      // Only collect entries from 2-byte CID CMaps (4-hex-digit source codes like <0043>).
      // LaTeX/pdfTeX PDFs use 1-byte CMaps (<XX> source codes) — those PDFs encode
      // text as readable ASCII in paren strings and don't need CID decoding.
      // Activating CID mode for 1-byte CMaps corrupts paren-string text.
      const has2ByteSources = /<[0-9a-fA-F]{4}>\s*<[0-9a-fA-F]/.test(content)
      if (!has2ByteSources) return

      const fontMap = parseCMap(content)
      fontMap.forEach((unicode, cid) => {
        const existing = combined.get(cid)
        // Keep existing non-PUA mapping; don't overwrite it with a PUA one
        if (existing !== undefined && !isPua(existing) && isPua(unicode)) return
        combined.set(cid, unicode)
      })
    }
  })

  return combined
}

/**
 * PDF text extractor using Node.js built-in zlib (no external dependencies).
 * Handles FlateDecode compressed streams — which is the standard for all modern PDFs.
 * Supports both single-byte (standard) and 2-byte CIDFont encoding via ToUnicode CMaps.
 * Returns empty string for image-only / encrypted PDFs — caller handles this.
 */
function extractPdfText(buf: Buffer, logger?: Logger): string {
  if (!buf || buf.length === 0) return ''

  try {
    // First pass: collect all ToUnicode CMap data
    const cidMap = collectCMaps(buf)
    const hasCidEncoding = cidMap.size > 0
    logger?.debug(`PDF CMap: ${cidMap.size} entries, cidMode=${hasCidEncoding}`)

    // Second pass: extract content streams
    const results: string[] = []

    walkPdfStreams(buf, (content, dictSlice) => {
      const isImageStream = /\/Subtype\s*\/Image\b/i.test(dictSlice)
      const isFontProgram = /\/FontFile\d*\b/i.test(dictSlice)
      const isCMapStream = content.includes('beginbfchar') || content.includes('beginbfrange')

      if (!isImageStream && !isFontProgram && !isCMapStream) {
        const text = extractTextFromContentStream(content, hasCidEncoding ? cidMap : undefined)
        if (text.trim().length > 5) results.push(text)
      }
    })

    const combined = results.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{4,}/g, '\n\n\n').trim()
    logger?.debug(`zlib extractor: ${results.length} streams processed, ${combined.length} chars`)
    return combined
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger?.warn(`PDF extraction error: ${msg}`)
    return ''
  }
}

/**
 * Extract text from a decompressed PDF content stream, preserving line structure.
 *
 * Text-showing operators: Tj (show string), TJ (show array), ' (newline+show)
 * Line-change operators emitting \n: Td, TD (relative move), T* (next line), Tm (absolute position)
 *
 * Without emitting \n for positioning operators, all text collapses to one line and
 * section detection fails. This is the primary cause of whole-resume-as-SUMMARY.
 *
 * @param cidMap  Optional ToUnicode CMap for 2-byte CIDFont decoding. When present,
 *                character strings are decoded as 2-byte CID pairs first; unmapped
 *                pairs fall back to single-byte Latin-1.
 */
function extractTextFromContentStream(content: string, cidMap?: CidToUnicode): string {
  const chunks: string[] = []
  let lastWasNewline = true // start true to avoid leading blank line
  let prevAbsY: number | null = null

  // In CID mode, spaces come from the CMap (e.g. <0003> → ' '). We must
  // allow whitespace-only text through and must NOT auto-insert spaces
  // between chunks — the PDF already encodes word spacing explicitly.
  const cidMode = !!cidMap && cidMap.size > 0

  function addText(text: string): void {
    if (!text) return
    // In non-CID mode drop chunks that are pure whitespace (they are artifacts
    // of empty Tj calls). In CID mode keep them — they are real space chars.
    if (!cidMode && !text.trim()) return
    // Auto-insert word separator in non-CID mode only
    if (!cidMode && !lastWasNewline && chunks.length > 0) {
      const last = chunks[chunks.length - 1] ?? ''
      if (!last.endsWith(' ') && !last.endsWith('\n') && !text.startsWith(' ')) {
        chunks.push(' ')
      }
    }
    chunks.push(text)
    lastWasNewline = false
  }

  function addNewline(): void {
    if (!lastWasNewline) {
      chunks.push('\n')
      lastWasNewline = true
    }
  }

  /**
   * Combined sequential regex — processes operators IN ORDER OF APPEARANCE.
   *
   * Groups:
   *  1  — TJ array body: [(str1)(str2)] TJ   (paren strings)
   *  2  — TJ array body: [<hex1><hex2>…] TJ  (hex strings — CIDFont style)
   *  3  — Tj paren string: (str) Tj
   *  4  — Tj hex string: <hex> Tj             (CIDFont — most common)
   *  5  — ' paren operator: (str) '
   *  6,7 — Td/TD: tx ty Td|TD
   *  8  — Tm Y: a b c d e Y Tm
   *  (no group) — T*
   */
  const seqRe =
    /(\[(?:[^[\]\\]|\\.)*\])\s*TJ|(\[(?:[^[\]<>]|<[0-9a-fA-F]*>)*\])\s*TJ|\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj|(<[0-9a-fA-F]*>)\s*Tj|\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*'|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+T[dD]|(?:-?\d+(?:\.\d+)?\s+){5}(-?\d+(?:\.\d+)?)\s+Tm|T\*/g

  let m: RegExpExecArray | null
  while ((m = seqRe.exec(content)) !== null) {
    const full = m[0]

    if (m[1] !== undefined) {
      // TJ: [(str1)(str2)…] TJ — paren string array
      // In LaTeX PDFs, large negative kerning numbers represent word spaces.
      // e.g. [(MAHDI)-245(ASGHARI)]TJ → "MAHDI ASGHARI" (not "MAHDIASGHARI")
      // Threshold: numbers < -80 → space. Small numbers (±80) = glyph kerning, ignore.
      const arr = m[1].slice(1, -1)
      let text = ''
      const tjItemRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|(-?\d+(?:\.\d+)?)/g
      let sm: RegExpExecArray | null
      while ((sm = tjItemRe.exec(arr)) !== null) {
        if (sm[1] !== undefined) {
          text += decodePdfString(sm[1], cidMap)
        } else if (sm[2] !== undefined && !cidMode) {
          // Large negative displacement = word space in non-CID (LaTeX) PDFs
          if (parseFloat(sm[2]) < -80 && !text.endsWith(' ')) text += ' '
        }
      }
      addText(text)
    } else if (m[2] !== undefined) {
      // TJ: [<hex1><hex2>…] TJ — hex string array (CIDFont)
      const arr = m[2].slice(1, -1)
      let text = ''
      const hexRe = /<([0-9a-fA-F]*)>/g
      let hm: RegExpExecArray | null
      while ((hm = hexRe.exec(arr)) !== null) {
        text += decodeHexString(hm[1], cidMap)
      }
      addText(text)
    } else if (m[3] !== undefined) {
      // Tj: (str) Tj — paren string
      addText(decodePdfString(m[3], cidMap))
    } else if (m[4] !== undefined) {
      // Tj: <hex> Tj — hex string (CIDFont — most common in modern PDFs)
      addText(decodeHexString(m[4].slice(1, -1), cidMap))
    } else if (m[5] !== undefined) {
      // ' operator: move to next line, then show string
      addNewline()
      addText(decodePdfString(m[5], cidMap))
    } else if (m[6] !== undefined && m[7] !== undefined) {
      // Td / TD: tx ty — relative text position move
      const ty = parseFloat(m[7])
      // Emit newline only when there is vertical displacement (ty != 0)
      // ty < 0 = downward move in PDF coords (standard line break)
      // ty > 0 = upward move (e.g. superscript) — still a line boundary
      if (Math.abs(ty) > 0.5) addNewline()
    } else if (m[8] !== undefined) {
      // Tm: a b c d e f Tm — absolute text matrix, group 8 = Y (f)
      const y = parseFloat(m[8])
      // Emit newline when absolute Y position changes significantly
      if (prevAbsY === null || Math.abs(y - prevAbsY) > 3) {
        addNewline()
        prevAbsY = y
      } else if (!lastWasNewline) {
        // Same visual line, but a new text object (different X position).
        // Insert a space so adjacent inline elements don't concatenate.
        // e.g. "989034139024" + "mahankhodashenas@gmail.com" → with space
        const last = chunks[chunks.length - 1] ?? ''
        if (!last.endsWith(' ') && !last.endsWith('\n')) {
          chunks.push(' ')
        }
      }
    } else if (full.trim() === 'T*') {
      // T* — move to start of next line
      addNewline()
    }
  }

  return chunks
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')     // trim spaces adjacent to newlines
    .replace(/\n{3,}/g, '\n\n')  // collapse triple+ newlines
    .trim()
}

/**
 * Decode a PDF hex string (e.g. "00430004") using the ToUnicode CMap.
 * Each 4 hex digits = one 2-byte CID looked up in cidMap.
 * Falls back to single-byte ASCII for unmapped pairs.
 */
function decodeHexString(hex: string, cidMap?: CidToUnicode): string {
  if (!hex) return ''
  // Normalise: ensure even length
  const h = hex.length % 2 === 0 ? hex : hex + '0'
  let result = ''

  if (cidMap && cidMap.size > 0) {
    // 2-byte mode: consume 4 hex digits at a time → 1 CID
    let i = 0
    while (i + 3 < h.length) {
      const cid = parseInt(h.slice(i, i + 4), 16)
      const mapped = cidMap.get(cid)
      if (mapped !== undefined) {
        if (mapped.codePointAt(0) !== 0) result += mapped
      } else {
        // Fallback: try each byte individually
        const b1 = parseInt(h.slice(i, i + 2), 16)
        const b2 = parseInt(h.slice(i + 2, i + 4), 16)
        if (b1 > 31 && b1 < 256) result += String.fromCharCode(b1)
        if (b2 > 31 && b2 < 256) result += String.fromCharCode(b2)
      }
      i += 4
    }
    // Handle trailing 2-hex-digit pair
    if (i + 1 < h.length) {
      const b = parseInt(h.slice(i, i + 2), 16)
      if (b > 31 && b < 256) result += String.fromCharCode(b)
    }
  } else {
    // Single-byte mode
    for (let i = 0; i + 1 < h.length; i += 2) {
      const b = parseInt(h.slice(i, i + 2), 16)
      if (b > 31 && b < 256) result += String.fromCharCode(b)
    }
  }
  return result
}

/**
 * Decode PDF string escape sequences to readable text.
 *
 * When cidMap is provided (CIDFont PDF), characters are decoded as 2-byte pairs:
 *   - Each pair of bytes forms a 16-bit CID looked up in cidMap → Unicode char
 *   - Unmapped CIDs fall back to individual byte Latin-1 decoding
 *   - Null/control Unicode codepoints from the map are replaced with space
 *
 * Without cidMap, single-byte Latin-1 decoding is used (classic PDFs).
 */
function decodePdfString(s: string, cidMap?: CidToUnicode): string {
  // Step 1: Expand PDF escape sequences to raw bytes (as a char array)
  const raw: string[] = []
  let i = 0
  while (i < s.length) {
    if (s[i] === '\\') {
      const next = s[i + 1]
      if (next === 'n' || next === 'r') { raw.push(' '); i += 2 }
      else if (next === 't') { raw.push(' '); i += 2 }
      else if (next === '\\') { raw.push('\\'); i += 2 }
      else if (next === '(') { raw.push('('); i += 2 }
      else if (next === ')') { raw.push(')'); i += 2 }
      else if (next >= '0' && next <= '9') {
        // Octal escape: up to 3 digits
        const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? '0'
        const code = parseInt(oct, 8)
        raw.push(String.fromCharCode(code))
        i += 1 + oct.length
      } else {
        // Unknown escape — keep the character after backslash
        raw.push(next ?? ''); i += 2
      }
    } else {
      raw.push(s[i]); i++
    }
  }

  // Step 2: Decode raw bytes
  if (cidMap && cidMap.size > 0 && raw.length >= 2) {
    // CIDFont: decode as 2-byte pairs
    let result = ''
    let j = 0
    while (j < raw.length - 1) {
      const hi = raw[j].charCodeAt(0)
      const lo = raw[j + 1].charCodeAt(0)
      const cid = (hi << 8) | lo
      const mapped = cidMap.get(cid)
      if (mapped !== undefined) {
        // Skip null/control chars the CMap explicitly maps to U+0000
        if (mapped.codePointAt(0) !== 0) result += mapped
        j += 2
      } else {
        // Unmapped 2-byte pair — try 1-byte fallback for each byte
        const ch = raw[j].charCodeAt(0)
        result += ch > 31 && ch < 256 ? raw[j] : ' '
        j++
      }
    }
    // Handle trailing unpaired byte
    if (j < raw.length) {
      const ch = raw[j].charCodeAt(0)
      result += ch > 31 && ch < 256 ? raw[j] : ' '
    }
    return result
  }

  // Single-byte mode: filter control characters
  return raw
    .map(c => {
      const code = c.charCodeAt(0)
      return code > 31 && code < 256 ? c : ' '
    })
    .join('')
}
