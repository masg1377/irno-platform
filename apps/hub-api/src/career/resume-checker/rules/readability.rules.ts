/**
 * Readability Rules — checks language clarity, sentence length, and tone.
 *
 * Also includes structural collapse detection:
 * - If the parsed resume has very few sections but long content, the parser may have
 *   collapsed multiple sections into one SUMMARY — this is flagged as a warning.
 * - If the SUMMARY section itself is abnormally large (> 1000 chars), it is flagged.
 */

import { CheckFinding, FindingSeverity, RuleContext } from '../types.js'
import { countSections, getSectionContent } from '../helpers.js'

function finding(
  ruleCode: string,
  severity: FindingSeverity,
  title: string,
  message: string,
  recommendation?: string,
  section?: string,
): CheckFinding {
  return {
    id: `rd_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'READABILITY',
    severity,
    title,
    message,
    section,
    recommendation,
    ruleCode: `RD_${ruleCode.toUpperCase()}`,
  }
}

export function runReadabilityRules(ctx: RuleContext): CheckFinding[] {
  const { sections, fullText } = ctx
  const findings: CheckFinding[] = []

  // ── RD_WORD_COUNT ──────────────────────────────────────────────────────────
  const words = fullText.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  if (wordCount < 80) {
    findings.push(
      finding(
        'very_short',
        'WARNING',
        'رزومه خیلی کوتاه است',
        `رزومه فقط ${wordCount} کلمه دارد. رزومه‌های حرفه‌ای معمولاً ۲۰۰–۶۰۰ کلمه دارند.`,
        'بخش‌های بیشتری اضافه کنید و تجربیات را با جزئیات بیشتری توصیف کنید.',
      ),
    )
  } else if (wordCount > 800) {
    findings.push(
      finding(
        'too_long',
        'WARNING',
        'رزومه خیلی بلند است',
        `رزومه ${wordCount} کلمه دارد. برای توسعه‌دهندگان، زیر ۵۰۰ کلمه معمولاً کافی است.`,
        'محتوای کم‌اهمیت را حذف کنید و بر مرتبط‌ترین تجربیات تمرکز کنید.',
      ),
    )
  } else {
    findings.push(
      finding(
        'good_length',
        'PASS',
        'طول رزومه مناسب است',
        `رزومه ${wordCount} کلمه دارد — در محدوده توصیه‌شده.`,
      ),
    )
  }

  // ── RD_FIRST_PERSON ────────────────────────────────────────────────────────
  // Resume best practice: avoid first person ("I built...", "من ساختم...")
  const firstPersonEN = (fullText.match(/\b(I |I'|I've |I am |I was )/g) ?? []).length
  const firstPersonFA = (fullText.match(/(من |من‌)/g) ?? []).length

  if (firstPersonEN > 3 || firstPersonFA > 3) {
    findings.push(
      finding(
        'first_person',
        'INFO',
        'استفاده از ضمیر اول شخص',
        `${firstPersonEN + firstPersonFA} بار «من» یا «I» در رزومه یافت شد. رزومه‌های حرفه‌ای معمولاً از ضمیر اول شخص پرهیز می‌کنند.`,
        'به جای «I built the system» بنویسید «Built the system». به جای «من طراحی کردم» بنویسید «طراحی سیستم...».',
      ),
    )
  }

  // ── RD_BUZZWORDS ───────────────────────────────────────────────────────────
  const BUZZWORDS = [
    'passionate', 'ninja', 'wizard', 'rockstar', 'guru', 'evangelist',
    'synergy', 'leverage', 'disruptive', 'paradigm shift', 'thought leader',
    'innovative', 'dynamic', 'results-driven', 'team player', 'self-starter',
    'hardworking', 'detail-oriented',
    'پرشور', 'خلاق', 'نینجا', 'ویزارد', 'روکستار', 'علاقه‌مند',
  ]
  const foundBuzzwords = BUZZWORDS.filter((bw) =>
    fullText.toLowerCase().includes(bw.toLowerCase()),
  )
  if (foundBuzzwords.length > 2) {
    findings.push(
      finding(
        'buzzwords',
        'INFO',
        'کلمات کلیشه‌ای یافت شد',
        `این کلمات ارزش افزوده کمی دارند: ${foundBuzzwords.slice(0, 4).join('، ')}`,
        'به جای کلمات کلیشه‌ای، از عبارات مشخص با اعداد و نتایج استفاده کنید.',
      ),
    )
  }

  // ── RD_SUMMARY_QUALITY ─────────────────────────────────────────────────────
  const summarySection = sections.find((s) => s.type === 'SUMMARY' && s.isVisible)
  const summaryText = String(summarySection?.content?.text ?? '').trim()

  if (summaryText) {
    const summaryWords = summaryText.split(/\s+/).length
    if (summaryWords < 20) {
      findings.push(
        finding(
          'summary_too_short',
          'INFO',
          'خلاصه خیلی کوتاه است',
          `خلاصه فقط ${summaryWords} کلمه دارد. ۳۰–۸۰ کلمه توصیه می‌شود.`,
          'تخصص اصلی، چند سال تجربه، و هدف شغلی را در خلاصه بنویسید.',
          'SUMMARY',
        ),
      )
    }
  }

  // ── RD_MASSIVE_SUMMARY ─────────────────────────────────────────────────────
  // A SUMMARY section with > 1000 chars is likely collapsed content from the parser.
  // Check both structured SUMMARY and detected SUMMARY from plain text.
  const detectedSummaryContent = getSectionContent(ctx, 'SUMMARY')
  const checkSummaryText = summaryText || detectedSummaryContent
  if (checkSummaryText.length > 1000) {
    findings.push(
      finding(
        'massive_summary',
        'WARNING',
        'خلاصه غیرعادی بزرگ است — احتمال ادغام بخش‌ها',
        `خلاصه ${checkSummaryText.length} کاراکتر دارد (بیش از ۲× حد معمول). این معمولاً نشانه ادغام ناخواسته چند بخش رزومه در یک بخش است.`,
        'خلاصه را به ۳–۵ جمله کوتاه تبدیل کنید. سابقه کاری، تحصیلات و مهارت‌ها باید در بخش‌های جداگانه باشند.',
        'SUMMARY',
      ),
    )
  }

  // ── RD_COLLAPSED_STRUCTURE ─────────────────────────────────────────────────
  // If very few sections are detected but the text contains embedded section keywords,
  // the parser may have collapsed the structure. Flag this for diagnosis.
  const totalSectionCount = countSections(ctx)
  const SECTION_KEYWORDS_EN = ['experience', 'education', 'skills', 'projects', 'work history', 'employment']
  const SECTION_KEYWORDS_FA = ['سابقه', 'تحصیل', 'مهارت', 'پروژه', 'تجربه', 'آموزش']
  const allKeywords = [...SECTION_KEYWORDS_EN, ...SECTION_KEYWORDS_FA]
  const embeddedCount = allKeywords.filter((kw) =>
    fullText.toLowerCase().includes(kw.toLowerCase()),
  ).length

  if (totalSectionCount <= 2 && wordCount > 200 && embeddedCount >= 3) {
    findings.push(
      finding(
        'collapsed_structure',
        'WARNING',
        'ساختار رزومه ممکن است تشخیص داده نشده باشد',
        `تنها ${totalSectionCount} بخش شناسایی شد اما متن حاوی ${embeddedCount} عنوان بخشی است. احتمالاً رزومه در حین تجزیه ادغام شده.`,
        'رزومه را با عناوین واضح‌تر (EXPERIENCE, EDUCATION, SKILLS) دوباره آپلود کنید یا از حالت «چسباندن متن» استفاده کنید.',
      ),
    )
  }

  // ── RD_MIXED_LANGUAGES ─────────────────────────────────────────────────────
  // Detect heavy mixing of FA and EN within same section (not tech terms)
  const englishWordRate = words.filter((w) => /^[a-zA-Z]+$/.test(w) && w.length > 3).length / Math.max(wordCount, 1)
  const persianWordRate = words.filter((w) => /[؀-ۿ]/.test(w)).length / Math.max(wordCount, 1)

  if (englishWordRate > 0.1 && persianWordRate > 0.1) {
    findings.push(
      finding(
        'mixed_language',
        'INFO',
        'رزومه ترکیبی فارسی–انگلیسی است',
        'رزومه دارای هر دو زبان فارسی و انگلیسی است. این برای رزومه‌های ایرانی رایج است، اما سعی کنید یکنواختی را حفظ کنید.',
        'زبان رزومه را مشخص کنید. اگر فارسی است، اصطلاحات فنی به انگلیسی می‌توانند بمانند.',
      ),
    )
  }

  return findings
}
