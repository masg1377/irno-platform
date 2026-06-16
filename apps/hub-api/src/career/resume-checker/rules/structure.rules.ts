/**
 * Structure Rules — evaluates section order, count, naming, and hierarchy.
 */

import { CheckFinding, FindingSeverity, RuleContext } from '../types.js'
import { countSections, hasSection } from '../helpers.js'

function finding(
  ruleCode: string,
  severity: FindingSeverity,
  title: string,
  message: string,
  recommendation?: string,
  section?: string,
): CheckFinding {
  return {
    id: `str_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'STRUCTURE',
    severity,
    title,
    message,
    section,
    recommendation,
    ruleCode: `STR_${ruleCode.toUpperCase()}`,
  }
}

// Ideal section order for a developer resume
const RECOMMENDED_ORDER = ['SUMMARY', 'SKILL', 'EXPERIENCE', 'PROJECT', 'EDUCATION', 'CERTIFICATE', 'LANGUAGE', 'LINK']

export function runStructureRules(ctx: RuleContext): CheckFinding[] {
  const { sections } = ctx
  const findings: CheckFinding[] = []

  const visible = sections.filter((s) => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
  // For plain-text resumes, use the total detected section count
  const totalSectionCount = countSections(ctx)

  // ── STR_SECTION_COUNT ──────────────────────────────────────────────────────
  if (totalSectionCount < 3) {
    findings.push(
      finding(
        'too_few_sections',
        'CRITICAL',
        'رزومه خیلی کم بخش دارد',
        `فقط ${totalSectionCount} بخش فعال وجود دارد. حداقل ۴ بخش توصیه می‌شود.`,
        'بخش‌های مهارت، تجربه، خلاصه و تحصیلات را اضافه کنید.',
      ),
    )
  } else if (totalSectionCount >= 5) {
    findings.push(
      finding(
        'good_section_count',
        'PASS',
        'تعداد بخش‌ها مناسب است',
        `رزومه دارای ${totalSectionCount} بخش فعال است.`,
      ),
    )
  } else {
    findings.push(
      finding(
        'ok_section_count',
        'INFO',
        `${totalSectionCount} بخش فعال`,
        `رزومه ${totalSectionCount} بخش دارد. اضافه کردن ۱–۲ بخش دیگر آن را کامل‌تر می‌کند.`,
        'پروژه‌ها، مدارک، یا پروفایل‌های شبکه‌های اجتماعی را اضافه کنید.',
      ),
    )
  }

  // ── STR_SUMMARY_FIRST ──────────────────────────────────────────────────────
  if (visible.length > 0) {
    const firstType = visible[0]?.type
    if (firstType !== 'SUMMARY') {
      findings.push(
        finding(
          'summary_not_first',
          'INFO',
          'خلاصه اولین بخش نیست',
          `اولین بخش «${firstType ?? 'نامشخص'}» است. خلاصه حرفه‌ای باید اول باشد.`,
          'بخش SUMMARY را به ابتدای رزومه منتقل کنید.',
          'SUMMARY',
        ),
      )
    } else {
      findings.push(
        finding('summary_first', 'PASS', 'خلاصه در ابتدای رزومه است', 'ساختار صحیح: خلاصه اولین بخش است.'),
      )
    }
  }

  // ── STR_SKILLS_POSITION ────────────────────────────────────────────────────
  const skillIdx = visible.findIndex((s) => s.type === 'SKILL')
  const expIdx = visible.findIndex((s) => s.type === 'EXPERIENCE')
  if (skillIdx >= 0 && expIdx >= 0 && skillIdx > expIdx + 1) {
    findings.push(
      finding(
        'skills_after_experience',
        'INFO',
        'مهارت‌ها بعد از تجربه کاری هستند',
        'برای توسعه‌دهندگان، قرار دادن مهارت‌ها قبل از تجربه کاری رایج‌تر است.',
        'بخش مهارت‌ها را قبل از تجربه کاری منتقل کنید.',
        'SKILL',
      ),
    )
  }

  // ── STR_EDUCATION_POSITION ─────────────────────────────────────────────────
  const eduIdx = visible.findIndex((s) => s.type === 'EDUCATION')
  if (eduIdx >= 0 && eduIdx < 2) {
    findings.push(
      finding(
        'education_too_early',
        'INFO',
        'تحصیلات در ابتدای رزومه است',
        'برای متقاضیان با تجربه، تحصیلات باید بعد از تجربه کاری باشد.',
        'تحصیلات را به انتهای رزومه منتقل کنید (مگر اینکه تازه‌فارغ‌التحصیل هستید).',
        'EDUCATION',
      ),
    )
  }

  // ── STR_LINK_SECTION ───────────────────────────────────────────────────────
  // Check for professional links (GitHub, LinkedIn, portfolio) — separate from contact info.
  // Contact info (email/phone) is checked in ATS rules; this rule is about public profiles.
  const hasProfessionalLinks =
    hasSection(ctx, 'LINK') ||
    /github\.com|linkedin\.com|gitlab\.com|portfolio|behance\.net/i.test(ctx.fullText)
  const hasContactInfo =
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(ctx.fullText) ||
    /(?:\+?98[-\s]?|0)9\d{9}/.test(ctx.fullText) ||
    /\+?\d[\d\s\-()]{9,15}/.test(ctx.fullText)

  if (!hasProfessionalLinks && !hasContactInfo) {
    // No contact AND no professional links — most serious case
    findings.push(
      finding(
        'no_links',
        'WARNING',
        'اطلاعات تماس یا لینک حرفه‌ای وجود ندارد',
        'رزومه باید حداقل یک راه تماس یا لینک حرفه‌ای داشته باشد.',
        'ایمیل، شماره تماس، GitHub، یا LinkedIn اضافه کنید.',
        'LINK',
      ),
    )
  } else if (!hasProfessionalLinks && hasContactInfo) {
    // Has contact info but no professional links — soft suggestion only
    findings.push(
      finding(
        'no_professional_links',
        'INFO',
        'لینک حرفه‌ای وجود ندارد',
        'GitHub، LinkedIn، یا پورتفولیو رزومه را قوی‌تر می‌کند.',
        'بخش LINK با GitHub یا LinkedIn اضافه کنید.',
        'LINK',
      ),
    )
  } else {
    findings.push(
      finding('has_links', 'PASS', 'لینک حرفه‌ای یا اطلاعات تماس موجود است', 'روش ارتباطی در رزومه موجود است.'),
    )
  }

  // ── STR_SECTION_NAMING ─────────────────────────────────────────────────────
  // Custom sections with unusual names might confuse ATS
  const customSections = visible.filter((s) => s.type === 'CUSTOM' || s.type === 'TEXT_BLOCK')
  if (customSections.length > 2) {
    findings.push(
      finding(
        'too_many_custom',
        'INFO',
        `${customSections.length} بخش سفارشی وجود دارد`,
        'بخش‌های سفارشی زیاد ممکن است ATS را گیج کنند.',
        'تا حد ممکن از بخش‌های استاندارد مانند EXPERIENCE، SKILL، PROJECT استفاده کنید.',
      ),
    )
  }

  // ── STR_HIDDEN_SECTIONS ────────────────────────────────────────────────────
  const hiddenCount = sections.filter((s) => !s.isVisible).length
  if (hiddenCount > 0) {
    findings.push(
      finding(
        'hidden_sections',
        'INFO',
        `${hiddenCount} بخش پنهان است`,
        `${hiddenCount} بخش پنهان شده و در خروجی ظاهر نمی‌شود.`,
        'بخش‌های پنهان را بررسی کنید — اگر محتوا دارند، نمایش دهید.',
      ),
    )
  }

  // ── STR_SECTION_ORDER_SCORE ────────────────────────────────────────────────
  // Calculate how close the actual order is to recommended order
  let orderScore = 0
  const visibleTypes = visible.map((s) => s.type)
  for (let i = 0; i < RECOMMENDED_ORDER.length; i++) {
    const recType = RECOMMENDED_ORDER[i]
    const actualIdx = visibleTypes.indexOf(recType)
    if (actualIdx === -1) continue // not present, skip
    // Earlier is better — award points inversely proportional to position
    if (actualIdx <= i + 1) orderScore++
  }

  if (orderScore >= 4) {
    findings.push(
      finding('good_order', 'PASS', 'ترتیب بخش‌ها مناسب است', 'ترتیب بخش‌ها با استانداردهای رایج همخوانی دارد.'),
    )
  }

  return findings
}
