/**
 * HR Scan Rules — simulates a 5–10 second visual scan by a recruiter.
 *
 * HR reviewers look for: clear name/role, concise summary, easy-to-read
 * experience, visible achievements, and absence of visual clutter.
 */

import { CheckFinding, FindingSeverity, RuleContext } from '../types.js'
import { hasSection, getSectionContent } from '../helpers.js'

function finding(
  ruleCode: string,
  severity: FindingSeverity,
  title: string,
  message: string,
  recommendation?: string,
  section?: string,
): CheckFinding {
  return {
    id: `hr_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'HR_SCAN',
    severity,
    title,
    message,
    section,
    recommendation,
    ruleCode: `HR_${ruleCode.toUpperCase()}`,
  }
}

export function runHrScanRules(ctx: RuleContext): CheckFinding[] {
  const { sections, fullText, targetRole } = ctx
  const findings: CheckFinding[] = []

  // ── HR_CLEAR_ROLE ──────────────────────────────────────────────────────────
  // Is the person's role/title immediately obvious?
  // Check SUMMARY section text AND ctx.profile.headline (profile header extraction).
  // If either is present, HR can identify the role — do NOT fire CRITICAL.
  const summarySection = sections.find((s) => s.type === 'SUMMARY' && s.isVisible)
  const summaryText = (summarySection
    ? String(summarySection.content?.['text'] ?? '')
    : getSectionContent(ctx, 'SUMMARY')
  ).trim()
  const profileHeadline = ctx.profile?.headline ?? null

  if (!summaryText && !profileHeadline) {
    findings.push(
      finding(
        'no_role_visible',
        'CRITICAL',
        'موقعیت شغلی مشخص نیست',
        'HR در ۵ ثانیه اول باید بفهمد متقاضی چه کاره است. خلاصه حرفه‌ای وجود ندارد.',
        'یک خلاصه ۲–۴ جمله‌ای با عنوان شغلی و تخصص اصلی خود بنویسید.',
        'SUMMARY',
      ),
    )
  } else {
    // Check if targetRole aligns with summary
    if (targetRole) {
      const roleKeywords = targetRole.toLowerCase().split(/\s+/)
      const summaryLower = summaryText.toLowerCase()
      const aligned = roleKeywords.some((kw) => kw.length > 3 && summaryLower.includes(kw))
      if (!aligned) {
        findings.push(
          finding(
            'role_misalignment',
            'WARNING',
            'خلاصه با موقعیت هدف همخوانی ندارد',
            `موقعیت هدف «${targetRole}» در خلاصه حرفه‌ای ذکر نشده است.`,
            'در ابتدای خلاصه، موقعیت شغلی هدف خود را صریح بیان کنید.',
            'SUMMARY',
          ),
        )
      }
    }
    findings.push(
      finding('role_visible', 'PASS', 'خلاصه حرفه‌ای موجود است', 'HR می‌تواند سریعاً نقش متقاضی را شناسایی کند.'),
    )
  }

  // ── HR_SUMMARY_CONCISE ─────────────────────────────────────────────────────
  if (summaryText && summaryText.length > 500) {
    findings.push(
      finding(
        'summary_verbose',
        'WARNING',
        'خلاصه خیلی طولانی است',
        `خلاصه ${summaryText.length} کاراکتر دارد. HR در نگاه اول بیشتر از ۱۵۰ کلمه نمی‌خواند.`,
        'خلاصه را به ۳–۵ جمله کلیدی تبدیل کنید.',
        'SUMMARY',
      ),
    )
  }

  // ── HR_SKILLS_SCANNABLE ────────────────────────────────────────────────────
  const skillSection = sections.find((s) => s.type === 'SKILL' && s.isVisible)
  if (skillSection) {
    const groups: unknown[] = Array.isArray(skillSection.content?.groups)
      ? (skillSection.content.groups as unknown[])
      : []

    if (groups.length === 0) {
      // Try flat skills list
      const flatSkills: string[] = Array.isArray(skillSection.content?.skills)
        ? (skillSection.content.skills as string[])
        : []
      if (flatSkills.length > 20) {
        findings.push(
          finding(
            'skills_too_many_flat',
            'WARNING',
            'مهارت‌ها گروه‌بندی نشده‌اند',
            `${flatSkills.length} مهارت در یک لیست طولانی وجود دارد. این برای اسکن سریع HR مناسب نیست.`,
            'مهارت‌ها را در گروه‌های منطقی تقسیم کنید: Frontend، Backend، DevOps، Tools و غیره.',
            'SKILL',
          ),
        )
      }
    } else {
      findings.push(
        finding('skills_grouped', 'PASS', 'مهارت‌ها گروه‌بندی شده‌اند', `${groups.length} گروه مهارت ایجاد شده است.`),
      )
    }

    // Top skills should include role-relevant technologies
    if (targetRole) {
      const allSkillTexts: string[] = []
      for (const g of groups) {
        if (typeof g !== 'object' || g === null) continue
        const gr = g as Record<string, unknown>
        const skills: string[] = Array.isArray(gr.skills)
          ? (gr.skills as string[]).map(String)
          : []
        allSkillTexts.push(...skills)
      }
      const roleWords = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      const aligned = roleWords.some((rw) =>
        allSkillTexts.some((sk) => sk.toLowerCase().includes(rw)),
      )
      if (!aligned && allSkillTexts.length > 0) {
        findings.push(
          finding(
            'skills_role_misalignment',
            'INFO',
            'مهارت‌های اصلی با موقعیت هدف همخوانی ندارند',
            `هیچ مهارتی با «${targetRole}» مرتبط نیست. HR انتظار دارد مهارت‌های اصلی واضح باشند.`,
            'مطمئن شوید فناوری‌های اصلی نقش هدف در لیست مهارت‌ها حضور دارند.',
            'SKILL',
          ),
        )
      }
    }
  }

  // ── HR_EXPERIENCE_CLARITY ──────────────────────────────────────────────────
  const expSection = sections.find((s) => s.type === 'EXPERIENCE' && s.isVisible)
  if (expSection) {
    const entries: Record<string, unknown>[] = Array.isArray(expSection.content?.entries)
      ? (expSection.content.entries as Record<string, unknown>[])
      : Array.isArray(expSection.content?.items)
        ? (expSection.content.items as Record<string, unknown>[])
        : []

    const missingTitles = entries.filter(
      (e) => !String(e.role ?? e.title ?? '').trim(),
    )
    const missingCompanies = entries.filter(
      (e) => !String(e.company ?? e.organization ?? '').trim(),
    )

    if (missingTitles.length > 0) {
      findings.push(
        finding(
          'missing_job_titles',
          'WARNING',
          `${missingTitles.length} موقعیت شغلی بدون عنوان`,
          'HR باید سریعاً عنوان شغلی را ببیند.',
          'برای هر موقعیت، عنوان شغلی دقیق وارد کنید.',
          'EXPERIENCE',
        ),
      )
    }

    if (missingCompanies.length > 0) {
      findings.push(
        finding(
          'missing_companies',
          'WARNING',
          `${missingCompanies.length} موقعیت شغلی بدون نام شرکت`,
          'نام شرکت برای ارزیابی اعتبار سابقه کاری ضروری است.',
          'نام شرکت یا سازمان را برای هر موقعیت وارد کنید.',
          'EXPERIENCE',
        ),
      )
    }

    if (missingTitles.length === 0 && missingCompanies.length === 0 && entries.length > 0) {
      findings.push(
        finding(
          'experience_clear',
          'PASS',
          'عنوان‌های شغلی و شرکت‌ها مشخص هستند',
          'تمام موقعیت‌های شغلی دارای عنوان و نام شرکت هستند.',
        ),
      )
    }

    // Check for dense paragraphs — HR prefers bullets
    const denseEntries = entries.filter((e) => {
      const desc = String(e.description ?? '').trim()
      const bullets: string[] = Array.isArray(e.achievements) ? (e.achievements as string[]) : []
      // Long paragraph with no bullets is bad for HR scan
      return desc.length > 300 && bullets.length === 0
    })
    if (denseEntries.length > 0) {
      findings.push(
        finding(
          'dense_paragraphs',
          'WARNING',
          `${denseEntries.length} موقعیت شغلی متن فشرده دارد`,
          'HR ترجیح می‌دهد دستاوردها به صورت بولت‌های کوتاه باشند، نه پاراگراف طولانی.',
          'توضیحات را به بولت‌های ۱–۲ جمله‌ای تبدیل کنید.',
          'EXPERIENCE',
        ),
      )
    }
  }

  // ── HR_ACHIEVEMENTS_VISIBLE ────────────────────────────────────────────────
  const hasProjects = hasSection(ctx, 'PROJECT')
  const hasCerts = hasSection(ctx, 'CERTIFICATE')

  if (!hasProjects && !hasCerts && !expSection && !hasSection(ctx, 'EXPERIENCE')) {
    findings.push(
      finding(
        'no_achievements',
        'WARNING',
        'هیچ بخش دستاورد یا پروژه‌ای وجود ندارد',
        'HR به دنبال دستاوردها می‌گردد. رزومه باید پروژه، تجربه یا مدرک داشته باشد.',
        'حداقل یک بخش پروژه، تجربه کاری، یا مدرک اضافه کنید.',
      ),
    )
  }

  // ── HR_TEXT_DENSITY ────────────────────────────────────────────────────────
  const avgWordsPerSection =
    sections.filter((s) => s.isVisible).length > 0
      ? fullText.split(/\s+/).length / sections.filter((s) => s.isVisible).length
      : 0

  if (avgWordsPerSection > 150) {
    findings.push(
      finding(
        'text_too_dense',
        'INFO',
        'متن خیلی فشرده است',
        'هر بخش به طور متوسط بیش از ۱۵۰ کلمه دارد. رزومه ممکن است برای اسکن سریع سنگین باشد.',
        'بخش‌های طولانی را خلاصه کنید یا به بولت‌های کوتاه‌تر تبدیل کنید.',
      ),
    )
  }

  return findings
}
