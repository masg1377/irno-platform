/**
 * Completeness Rules — checks that all expected resume sections are present
 * and adequately filled. Severity depends on target role.
 *
 * Contact info (email/phone) is checked separately from professional links (GitHub/LinkedIn).
 * A LINK section absence is only a WARNING if contact info is missing from fullText too.
 * If email or phone exist in the raw text, the LINK finding is downgraded to INFO.
 */

import { CheckFinding, FindingSeverity, RuleContext } from '../types.js'
import { hasSection } from '../helpers.js'

function finding(
  ruleCode: string,
  severity: FindingSeverity,
  title: string,
  message: string,
  recommendation?: string,
  section?: string,
): CheckFinding {
  return {
    id: `cmp_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'COMPLETENESS',
    severity,
    title,
    message,
    section,
    recommendation,
    ruleCode: `CMP_${ruleCode.toUpperCase()}`,
  }
}

interface SectionRequirement {
  type: string
  label: string
  severity: FindingSeverity
  recommendation: string
}

const DEVELOPER_REQUIREMENTS: SectionRequirement[] = [
  { type: 'SUMMARY',     label: 'خلاصه حرفه‌ای',   severity: 'WARNING',  recommendation: 'یک خلاصه ۳–۵ جمله‌ای درباره تخصص خود بنویسید.' },
  { type: 'SKILL',       label: 'مهارت‌ها',          severity: 'CRITICAL', recommendation: 'مهارت‌های فنی و ابزارهای خود را اضافه کنید.' },
  { type: 'EXPERIENCE',  label: 'تجربه کاری',         severity: 'WARNING',  recommendation: 'تجربه شغلی یا پروژه‌های حرفه‌ای خود را بنویسید.' },
  { type: 'PROJECT',     label: 'پروژه‌ها',           severity: 'WARNING',  recommendation: 'حداقل ۲ پروژه مهم با توضیح و لینک اضافه کنید.' },
  { type: 'EDUCATION',   label: 'تحصیلات',            severity: 'INFO',     recommendation: 'سابقه تحصیلی یا دوره‌های مهم را اضافه کنید.' },
  // NOTE: LINK is checked separately below — it's split into contact info vs professional links
]

const GENERAL_REQUIREMENTS: SectionRequirement[] = [
  { type: 'SUMMARY',    label: 'خلاصه حرفه‌ای',  severity: 'WARNING',  recommendation: 'یک خلاصه کوتاه درباره خود بنویسید.' },
  { type: 'SKILL',      label: 'مهارت‌ها',         severity: 'WARNING',  recommendation: 'مهارت‌های اصلی خود را اضافه کنید.' },
  { type: 'EXPERIENCE', label: 'تجربه کاری',        severity: 'WARNING',  recommendation: 'تجربه شغلی خود را بنویسید.' },
  { type: 'EDUCATION',  label: 'تحصیلات',           severity: 'INFO',     recommendation: 'سابقه تحصیلی را اضافه کنید.' },
  // NOTE: LINK is checked separately below — it's split into contact info vs professional links
]

/** Returns true if email or phone number appears in the raw resume text */
function hasContactInfo(fullText: string): boolean {
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
  const phoneRe = /(?:\+98|0098|0)?9\d{9}|(?:\+\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{4}/
  return emailRe.test(fullText) || phoneRe.test(fullText)
}

/** Returns true if GitHub or LinkedIn URLs appear in the raw resume text */
function hasProfessionalLinks(fullText: string): boolean {
  return /github\.com\/|linkedin\.com\//i.test(fullText)
}

function isDeveloperRole(targetRole?: string): boolean {
  if (!targetRole) return false
  const keywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'react', 'next', 'node', 'python', 'mobile', 'devops', 'توسعه', 'برنامه‌نویس', 'مهندس']
  const lower = targetRole.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

export function runCompletenessRules(ctx: RuleContext): CheckFinding[] {
  const { sections, targetRole, fullText } = ctx
  const findings: CheckFinding[] = []

  const requirements = isDeveloperRole(targetRole)
    ? DEVELOPER_REQUIREMENTS
    : GENERAL_REQUIREMENTS

  // ── Check required sections ────────────────────────────────────────────────
  // Use hasSection() — checks BOTH ctx.sections (structured) AND ctx.detectedSections (plain text)
  let missingCritical = 0
  let missingWarning = 0
  let presentCount = 0

  for (const req of requirements) {
    if (hasSection(ctx, req.type)) {
      presentCount++
      // Only check emptiness for structured Irno sections (detected sections have content strings)
      const sec = sections.find((s) => s.type === req.type && s.isVisible)
      if (sec) {
        const isEmpty = isSectionEmpty(sec)
        if (isEmpty) {
          findings.push(
            finding(
              `${req.type.toLowerCase()}_empty`,
              'WARNING',
              `بخش «${req.label}» خالی است`,
              `بخش ${req.label} اضافه شده اما محتوا ندارد.`,
              req.recommendation,
              req.type,
            ),
          )
        }
      }
    } else {
      if (req.severity === 'CRITICAL') missingCritical++
      else if (req.severity === 'WARNING') missingWarning++

      findings.push(
        finding(
          `missing_${req.type.toLowerCase()}`,
          req.severity,
          `بخش «${req.label}» وجود ندارد`,
          `بخش ${req.label} در رزومه یافت نشد.`,
          req.recommendation,
          req.type,
        ),
      )
    }
  }

  // ── Contact info check (separate from LINK section) ────────────────────────
  // Contact info (email/phone) detected by text scan — independent of section detection.
  // Professional links (GitHub/LinkedIn) checked separately.
  const hasLinkSection = hasSection(ctx, 'LINK')
  const contactInfoPresent = hasContactInfo(fullText)
  const professionalLinksPresent = hasProfessionalLinks(fullText)

  if (!hasLinkSection) {
    if (!contactInfoPresent) {
      // No LINK section AND no email/phone in text — genuine missing contact info
      missingWarning++
      presentCount-- // don't count as present
      findings.push(
        finding(
          'missing_contact',
          'WARNING',
          'اطلاعات تماس وجود ندارد',
          'ایمیل یا شماره تلفن در رزومه یافت نشد.',
          'ایمیل و شماره تماس خود را در رزومه درج کنید.',
          'LINK',
        ),
      )
    } else {
      // Contact info is present as text — only warn about missing professional links
      presentCount++ // treat as partially present
      if (isDeveloperRole(targetRole) && !professionalLinksPresent) {
        findings.push(
          finding(
            'no_professional_links',
            'INFO',
            'لینک GitHub یا LinkedIn وجود ندارد',
            'برای موقعیت‌های توسعه‌دهنده، GitHub و LinkedIn بسیار مهم هستند.',
            'پروفایل GitHub و LinkedIn خود را اضافه کنید.',
            'LINK',
          ),
        )
      }
    }
  } else {
    presentCount++ // LINK section explicitly present
  }

  // ── Optional but valuable sections ────────────────────────────────────────
  if (!hasSection(ctx, 'CERTIFICATE') && !hasSection(ctx, 'COURSE')) {
    findings.push(
      finding(
        'no_certificates',
        'INFO',
        'بخش مدارک و دوره‌ها وجود ندارد',
        'مدارک و دوره‌های تخصصی اعتبار رزومه را افزایش می‌دهند.',
        'مدارک، دوره‌ها یا گواهینامه‌های مهم را اضافه کنید.',
      ),
    )
  }

  if (!hasSection(ctx, 'LANGUAGE')) {
    findings.push(
      finding(
        'no_languages',
        'INFO',
        'بخش زبان‌ها وجود ندارد',
        'اعلام سطح زبان انگلیسی (و زبان‌های دیگر) به ویژه برای شرکت‌های بین‌المللی مهم است.',
        'سطح زبان انگلیسی و زبان‌های دیگر را اضافه کنید.',
      ),
    )
  }

  // ── Completeness summary ───────────────────────────────────────────────────
  // +1 for the contact check (LINK slot) that we handle separately above
  const totalRequired = requirements.length + 1
  const completenessRate = Math.min(1, presentCount / totalRequired)

  if (completenessRate >= 0.85) {
    findings.push(
      finding(
        'good_completeness',
        'PASS',
        'رزومه نسبتاً کامل است',
        `${presentCount} از ${totalRequired} بخش اصلی موجود هستند (${Math.round(completenessRate * 100)}%).`,
      ),
    )
  } else if (missingCritical > 0) {
    findings.push(
      finding(
        'critical_sections_missing',
        'CRITICAL',
        `${missingCritical} بخش حیاتی وجود ندارد`,
        'بخش‌های حیاتی که وجود ندارند شانس موفقیت رزومه را کاهش می‌دهند.',
        'بخش‌های علامت‌گذاری‌شده با «مهم» را اولویت‌بندی کنید.',
      ),
    )
  }

  return findings
}

function isSectionEmpty(sec: { type: string; content: Record<string, unknown> }): boolean {
  const content = sec.content
  if (!content) return true

  switch (sec.type) {
    case 'SUMMARY':
    case 'TEXT_BLOCK':
    case 'CUSTOM':
      return !String(content.text ?? '').trim()

    case 'EXPERIENCE':
    case 'EDUCATION':
    case 'PROJECT':
    case 'CERTIFICATE':
    case 'LANGUAGE':
    case 'LINK': {
      const items: unknown[] =
        (content.items as unknown[]) ??
        (content.entries as unknown[]) ??
        []
      return items.length === 0
    }

    case 'SKILL': {
      const groups: unknown[] = (content.groups as unknown[]) ?? []
      const skills: unknown[] = (content.skills as unknown[]) ?? []
      return groups.length === 0 && skills.length === 0
    }

    default:
      return false
  }
}
