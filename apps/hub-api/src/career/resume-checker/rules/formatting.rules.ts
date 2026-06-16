/**
 * Formatting Risk Rules — checks for layout and formatting patterns that
 * hurt ATS parsing or visual readability.
 */

import { CheckFinding, FindingSeverity, RuleContext } from '../types.js'

function finding(
  ruleCode: string,
  severity: FindingSeverity,
  title: string,
  message: string,
  recommendation?: string,
): CheckFinding {
  return {
    id: `fmt_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'FORMATTING',
    severity,
    title,
    message,
    recommendation,
    ruleCode: `FMT_${ruleCode.toUpperCase()}`,
  }
}

// Inconsistent date format patterns
const DATE_FORMATS = [
  /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,       // 2024-01-15
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/i, // Jan 2024
  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,            // 01/15/2024
  /\b\d{4}\b/,                              // 2024 (standalone year)
  /\b(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)\s+\d{4}\b/, // Persian months
]

export function runFormattingRules(ctx: RuleContext): CheckFinding[] {
  const { sections, fullText, styleConfig, templateType } = ctx
  const findings: CheckFinding[] = []

  // ── FMT_WATERMARK_ATS ─────────────────────────────────────────────────────
  // If this is an exported resume with watermark, warn about ATS
  const hasWatermark = (styleConfig?.includeWatermark ?? true) === true
  if (hasWatermark && templateType !== 'MODERN_MINIMAL') {
    findings.push(
      finding(
        'watermark_ats_risk',
        'INFO',
        'واترمارک در خروجی ATS ریسک دارد',
        'خروجی رایگان ایرنو CV دارای واترمارک است. بعضی از ATS سیستم‌ها واترمارک را به عنوان متن می‌خوانند.',
        'برای ارسال به سیستم‌های ATS، از نسخه بدون واترمارک استفاده کنید (ویژگی پریمیوم).',
      ),
    )
  }

  // ── FMT_FONT_SIZE ─────────────────────────────────────────────────────────
  if (styleConfig) {
    const fontSize = Number(styleConfig.fontSize ?? 0)
    if (fontSize > 0 && fontSize < 10) {
      findings.push(
        finding(
          'font_too_small',
          'WARNING',
          'اندازه فونت خیلی کوچک است',
          `اندازه فونت ${fontSize}px خیلی کوچک است. حداقل ۱۰–۱۱px توصیه می‌شود.`,
          'اندازه فونت را به حداقل ۱۰px افزایش دهید.',
        ),
      )
    } else if (fontSize > 14) {
      findings.push(
        finding(
          'font_too_large',
          'INFO',
          'اندازه فونت خیلی بزرگ است',
          `اندازه فونت ${fontSize}px ممکن است باعث شود رزومه در یک صفحه جا نشود.`,
          'اندازه فونت را به ۱۰–۱۲px کاهش دهید.',
        ),
      )
    }
  }

  // ── FMT_INCONSISTENT_DATES ────────────────────────────────────────────────
  const dateMatchCounts: number[] = DATE_FORMATS.map((pattern) => {
    const matches = fullText.match(new RegExp(pattern.source, 'gi'))
    return matches ? matches.length : 0
  })
  const nonZeroFormats = dateMatchCounts.filter((c) => c > 0).length
  if (nonZeroFormats > 2) {
    findings.push(
      finding(
        'inconsistent_dates',
        'WARNING',
        'فرمت تاریخ‌ها ناهماهنگ است',
        `${nonZeroFormats} فرمت مختلف تاریخ در رزومه یافت شد. ناهماهنگی تاریخ‌ها نشانه بی‌دقتی است.`,
        'از یک فرمت یکنواخت برای همه تاریخ‌ها استفاده کنید. مثال: «ژانویه ۲۰۲۴» یا «۲۰۲۴/۰۱».',
      ),
    )
  }

  // ── FMT_ALL_CAPS ──────────────────────────────────────────────────────────
  const capsWords = fullText.match(/\b[A-Z]{4,}\b/g) ?? []
  const genuineCaps = capsWords.filter(
    (w) => !['HTML', 'CSS', 'API', 'REST', 'SQL', 'AWS', 'GCP', 'JWT', 'SSR', 'CSR', 'SSG', 'PWA', 'RTL', 'OOP', 'SOLID', 'JSON', 'XML', 'HTTP', 'HTTPS', 'URL', 'UUID', 'MVP', 'CMS', 'SDK', 'IDE', 'CLI', 'CI', 'CD', 'QA', 'UI', 'UX', 'SEO', 'PDF', 'HTML5', 'CSS3', 'CRUD', 'ORM', 'MVC'].includes(w),
  )
  if (genuineCaps.length > 5) {
    findings.push(
      finding(
        'excessive_caps',
        'INFO',
        'استفاده زیاد از حروف بزرگ',
        `${genuineCaps.length} کلمه با حروف بزرگ یافت شد که ممکن است خوانایی را کاهش دهد.`,
        'از CAPS LOCK خودداری کنید — فقط برای اختصارات فنی مانند HTML، API مناسب است.',
      ),
    )
  }

  // ── FMT_TEXT_BLOCKS ───────────────────────────────────────────────────────
  const textBlockCount = sections.filter((s) => s.type === 'TEXT_BLOCK' && s.isVisible).length
  if (textBlockCount > 1) {
    findings.push(
      finding(
        'multiple_text_blocks',
        'WARNING',
        `${textBlockCount} بخش متن آزاد وجود دارد`,
        'بخش‌های TEXT_BLOCK توسط ATS طبقه‌بندی نمی‌شوند و ممکن است نادیده گرفته شوند.',
        'محتوای این بخش‌ها را به بخش‌های استاندارد منتقل کنید.',
      ),
    )
  }

  // ── FMT_DUPLICATE_SECTIONS ────────────────────────────────────────────────
  const typeCount: Record<string, number> = {}
  for (const s of sections.filter((s) => s.isVisible)) {
    typeCount[s.type] = (typeCount[s.type] ?? 0) + 1
  }
  const duplicateTypes = Object.entries(typeCount)
    .filter(([, count]) => count > 1 && !['TEXT_BLOCK', 'CUSTOM'].includes(''))
    .map(([type]) => type)

  if (duplicateTypes.length > 0) {
    findings.push(
      finding(
        'duplicate_section_types',
        'INFO',
        `بخش‌های تکراری: ${duplicateTypes.join('، ')}`,
        'داشتن چند بخش از یک نوع ممکن است ساختار رزومه را گیج‌کننده کند.',
        'بخش‌های هم‌نوع را ادغام کنید.',
      ),
    )
  }

  // ── FMT_GOOD_FORMATTING ───────────────────────────────────────────────────
  if (nonZeroFormats <= 2 && genuineCaps.length <= 5 && textBlockCount === 0) {
    findings.push(
      finding(
        'clean_formatting',
        'PASS',
        'فرمت‌بندی تمیز است',
        'مشکل قالب‌بندی جدی یافت نشد.',
      ),
    )
  }

  return findings
}
