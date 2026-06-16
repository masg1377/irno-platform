/**
 * Achievement Quality Rules — evaluates the strength of bullets / accomplishments.
 *
 * Strong bullets: action verb + measurable outcome + context/technology.
 * Weak bullets: passive voice, vague language, no numbers.
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
  affectedText?: string,
): CheckFinding {
  return {
    id: `ach_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'ACHIEVEMENT',
    severity,
    title,
    message,
    section,
    recommendation,
    affectedText,
    ruleCode: `ACH_${ruleCode.toUpperCase()}`,
  }
}

// Weak / passive indicators (Persian + English)
const WEAK_PHRASES_EN = [
  /\bworked on\b/i,
  /\bresponsible for\b/i,
  /\bhelped with\b/i,
  /\bassisted in\b/i,
  /\bwas involved in\b/i,
  /\btried to\b/i,
  /\bwas part of\b/i,
  /\bdid some\b/i,
  /\bvarious tasks\b/i,
  /\bgeneral tasks\b/i,
]
const WEAK_PHRASES_FA = [
  /کار کردم/,
  /وظیفه داشتم/,
  /مسئول بودم/,
  /کمک کردم/,
  /درگیر بودم/,
  /انجام دادم$/,
]

// Strong action verbs (English)
const ACTION_VERBS_EN = [
  /\b(built|developed|designed|implemented|led|reduced|increased|improved|optimised|optimized|created|architected|deployed|launched|migrated|refactored|automated|integrated|delivered|achieved|solved|analysed|analyzed|drove|scaled|managed|mentored|established|published|shipped|boosted|cut|saved|generated|grew|negotiated|secured|streamlined|transformed)\b/i,
]

// Numbers / metrics patterns
const METRIC_PATTERN = /\d+\s*(%|x|ms|kb|mb|gb|sec|min|hour|user|request|deploy|commit|project|team|week|month)/i
const NUMBER_PATTERN = /\b\d+\b/

export function runAchievementRules(ctx: RuleContext): CheckFinding[] {
  const { sections } = ctx
  const findings: CheckFinding[] = []

  const expSection = sections.find((s) => s.type === 'EXPERIENCE' && s.isVisible)
  const projectSection = sections.find((s) => s.type === 'PROJECT' && s.isVisible)

  // ── Analyse experience bullets ─────────────────────────────────────────────
  if (expSection) {
    const entries: Record<string, unknown>[] = Array.isArray(expSection.content?.entries)
      ? (expSection.content.entries as Record<string, unknown>[])
      : Array.isArray(expSection.content?.items)
        ? (expSection.content.items as Record<string, unknown>[])
        : []

    let totalBullets = 0
    let weakBullets = 0
    let bulletsTooLong = 0
    let bulletsTooShort = 0
    let bulletsNoAction = 0
    let bulletsWithMetrics = 0

    for (const entry of entries) {
      const bullets: string[] = Array.isArray(entry.achievements)
        ? (entry.achievements as string[])
        : Array.isArray(entry.bullets)
          ? (entry.bullets as string[])
          : []

      // Too few / many bullets per role
      if (bullets.length < 2) {
        const role = String(entry.role ?? entry.title ?? '').trim()
        findings.push(
          finding(
            'too_few_bullets',
            'WARNING',
            'تعداد بولت‌ها کم است',
            `موقعیت «${role || 'نامشخص'}» فقط ${bullets.length} توضیح دارد. حداقل ۲–۳ بولت توصیه می‌شود.`,
            'برای هر موقعیت شغلی ۲ تا ۵ دستاورد مشخص بنویسید.',
            'EXPERIENCE',
          ),
        )
      } else if (bullets.length > 7) {
        const role = String(entry.role ?? entry.title ?? '').trim()
        findings.push(
          finding(
            'too_many_bullets',
            'INFO',
            'تعداد بولت‌ها زیاد است',
            `موقعیت «${role || 'نامشخص'}» دارای ${bullets.length} توضیح است. بیش از ۵ بولت رزومه را سنگین می‌کند.`,
            'تأثیرگذارترین ۳–۵ دستاورد را انتخاب کنید.',
            'EXPERIENCE',
          ),
        )
      }

      totalBullets += bullets.length

      for (const bullet of bullets) {
        const text = bullet.trim()
        if (!text) continue

        // Length checks
        const wordCount = text.split(/\s+/).length
        if (wordCount > 35) {
          bulletsTooLong++
          findings.push(
            finding(
              'bullet_too_long',
              'WARNING',
              'جمله خیلی طولانی است',
              `«${text.slice(0, 60)}…» — این جمله ${wordCount} کلمه دارد و خیلی طولانی است.`,
              'هر بولت باید حداکثر ۲۰–۲۵ کلمه باشد و یک دستاورد واحد را بیان کند.',
              'EXPERIENCE',
              text.slice(0, 80),
            ),
          )
        } else if (wordCount < 4) {
          bulletsTooShort++
        }

        // Weak language check
        const isWeak =
          WEAK_PHRASES_EN.some((p) => p.test(text)) ||
          WEAK_PHRASES_FA.some((p) => p.test(text))

        if (isWeak) {
          weakBullets++
          findings.push(
            finding(
              'weak_bullet',
              'WARNING',
              'جمله مبهم یا منفعلانه است',
              `«${text.slice(0, 80)}» — این جمله دستاورد مشخصی بیان نمی‌کند.`,
              'با یک فعل فعال شروع کنید و نتیجه قابل اندازه‌گیری اضافه کنید. مثال: «Reduced load time by 40% through lazy loading»',
              'EXPERIENCE',
              text.slice(0, 80),
            ),
          )
        }

        // Action verb check (English bullets only)
        const isEnglish = /[a-zA-Z]{3,}/.test(text)
        if (isEnglish) {
          const hasAction = ACTION_VERBS_EN.some((p) => p.test(text))
          if (!hasAction) {
            bulletsNoAction++
          }
        }

        // Metrics check
        if (METRIC_PATTERN.test(text) || NUMBER_PATTERN.test(text)) {
          bulletsWithMetrics++
        }
      }
    }

    // Summary finding for action verbs
    if (bulletsNoAction > 2) {
      findings.push(
        finding(
          'weak_action_verbs',
          'WARNING',
          'فعل‌های فعال در بولت‌ها کم هستند',
          `${bulletsNoAction} بولت با فعل فعال شروع نمی‌شوند. شروع با فعل فعال رزومه را حرفه‌ای‌تر می‌کند.`,
          'هر بولت را با فعل قوی شروع کنید: Built, Led, Reduced, Improved, Architected, Shipped…',
          'EXPERIENCE',
        ),
      )
    }

    // Metrics coverage
    if (totalBullets > 0) {
      const metricRate = bulletsWithMetrics / totalBullets
      if (metricRate < 0.2 && totalBullets >= 4) {
        findings.push(
          finding(
            'low_metric_rate',
            'WARNING',
            'اعداد و نتایج اندازه‌گیری‌پذیر کم هستند',
            `فقط ${Math.round(metricRate * 100)}% از بولت‌ها عدد یا نتیجه مشخص دارند. اعداد رزومه را قوی‌تر می‌کنند.`,
            'برای هر دستاورد سعی کنید یک عدد اضافه کنید: «کاهش ۳۰ درصدی زمان بارگذاری»، «۵۰۰۰ کاربر فعال»، «تیم ۴ نفره»',
            'EXPERIENCE',
          ),
        )
      } else if (metricRate >= 0.4) {
        findings.push(
          finding(
            'good_metrics',
            'PASS',
            'استفاده خوب از اعداد و نتایج',
            `${Math.round(metricRate * 100)}% از بولت‌ها اعداد یا نتایج مشخص دارند.`,
          ),
        )
      }
    }
  } else if (hasSection(ctx, 'EXPERIENCE')) {
    // Experience detected from plain text — analyse bullets from fullText
    const expDetected = (ctx.detectedSections ?? []).find((d) => d.type === 'EXPERIENCE')
    const expText = expDetected?.content ?? ctx.fullText
    const textBullets = expText
      .split(/\n/)
      .map((l) => l.replace(/^[\s•·\-\*]+/, '').trim())
      .filter((l) => l.length > 10 && l.length < 300)

    if (textBullets.length > 0) {
      let weakCount = 0
      let actionCount = 0
      let metricCount = 0

      for (const bullet of textBullets) {
        if (WEAK_PHRASES_EN.some((p) => p.test(bullet))) weakCount++
        if (ACTION_VERBS_EN.some((p) => p.test(bullet))) actionCount++
        if (METRIC_PATTERN.test(bullet) || NUMBER_PATTERN.test(bullet)) metricCount++
      }

      if (weakCount > 2) {
        findings.push(
          finding(
            'weak_bullet',
            'WARNING',
            'جملات مبهم در تجربه کاری',
            `${weakCount} جمله منفعلانه در بخش تجربه شناسایی شد.`,
            'با فعل فعال شروع کنید: Built, Led, Implemented, Reduced, Improved…',
            'EXPERIENCE',
          ),
        )
      }

      const metricRate = textBullets.length > 0 ? metricCount / textBullets.length : 0
      if (metricRate < 0.2 && textBullets.length >= 4) {
        findings.push(
          finding(
            'low_metric_rate',
            'WARNING',
            'اعداد و نتایج اندازه‌گیری‌پذیر کم هستند',
            `برای تقویت رزومه، اعداد مشخص اضافه کنید: «کاهش ۳۰٪ زمان بارگذاری»، «۵۰۰۰ کاربر فعال»`,
            'برای هر دستاورد مهم، یک عدد اضافه کنید.',
            'EXPERIENCE',
          ),
        )
      } else if (metricRate >= 0.4) {
        findings.push(
          finding(
            'good_metrics',
            'PASS',
            'استفاده خوب از اعداد و نتایج',
            `${Math.round(metricRate * 100)}% از توضیحات تجربه اعداد مشخص دارند.`,
          ),
        )
      }
    }
  } else {
    // No experience detected — emit WARNING (was INFO; penalty bumped to -8)
    findings.push(
      finding(
        'no_experience_for_achievement',
        'WARNING',
        'بخش تجربه کاری یافت نشد',
        'برای ارزیابی کیفیت دستاوردها، بخش سابقه کاری لازم است. بدون تجربه کاری، نمره دستاورد محدود می‌شود.',
        'تجربیات شغلی خود را اضافه کنید.',
        'EXPERIENCE',
      ),
    )

    // If also no projects: no achievable content at all — CRITICAL
    if (!projectSection && !hasSection(ctx, 'PROJECT')) {
      findings.push(
        finding(
          'no_achievable_content',
          'CRITICAL',
          'هیچ محتوای قابل ارزیابی دستاورد وجود ندارد',
          'نه تجربه کاری و نه پروژه‌ای یافت نشد. بخش دستاوردها قابل ارزیابی نیست.',
          'سابقه کاری یا پروژه‌های واقعی خود را اضافه کنید.',
          'EXPERIENCE',
        ),
      )
    }
  }

  // ── Projects quality ───────────────────────────────────────────────────────
  if (projectSection) {
    const items: Record<string, unknown>[] = Array.isArray(projectSection.content?.items)
      ? (projectSection.content.items as Record<string, unknown>[])
      : []

    for (const project of items) {
      const desc = String(project.description ?? '').trim()
      const features: string[] = Array.isArray(project.features) ? (project.features as string[]) : []
      const achievements: string[] = Array.isArray(project.achievements) ? (project.achievements as string[]) : []
      const allBullets = [...features, ...achievements]

      if (!desc && allBullets.length === 0) {
        const title = String(project.title ?? '').trim()
        findings.push(
          finding(
            'project_no_description',
            'WARNING',
            'پروژه توضیح ندارد',
            `پروژه «${title || 'نامشخص'}» هیچ توضیح یا دستاوردی ندارد.`,
            'برای هر پروژه: نقش خود، تکنولوژی‌ها، و تأثیر / نتیجه را بنویسید.',
            'PROJECT',
          ),
        )
      }
    }
  }

  // ── Repeated bullets detection (simple) ───────────────────────────────────
  const allExpSections = sections.filter((s) => s.type === 'EXPERIENCE' && s.isVisible)
  const allBulletTexts: string[] = []
  for (const sec of allExpSections) {
    const entries: Record<string, unknown>[] = Array.isArray(sec.content?.entries)
      ? (sec.content.entries as Record<string, unknown>[])
      : []
    for (const entry of entries) {
      const bullets: string[] = Array.isArray(entry.achievements)
        ? (entry.achievements as string[])
        : []
      allBulletTexts.push(...bullets.map((b) => b.trim().toLowerCase()))
    }
  }
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const b of allBulletTexts) {
    if (b.length > 10) {
      if (seen.has(b)) duplicates.add(b)
      else seen.add(b)
    }
  }
  if (duplicates.size > 0) {
    findings.push(
      finding(
        'duplicate_bullets',
        'WARNING',
        'بولت‌های تکراری یافت شد',
        `${duplicates.size} جمله تکراری در بخش‌های تجربه کاری وجود دارد.`,
        'هر دستاورد باید منحصربه‌فرد و مختص به موقعیت شغلی مربوطه باشد.',
        'EXPERIENCE',
      ),
    )
  }

  return findings
}
