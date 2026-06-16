/**
 * ATS Rules — checks for machine-readability and ATS compatibility.
 *
 * ATS (Applicant Tracking Systems) parse resumes programmatically.
 * These rules detect patterns that cause parse failures or score penalties.
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
  affectedText?: string,
): CheckFinding {
  return {
    id: `ats_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'ATS',
    severity,
    title,
    message,
    section,
    recommendation,
    affectedText,
    ruleCode: `ATS_${ruleCode.toUpperCase()}`,
  }
}

export function runAtsRules(ctx: RuleContext): CheckFinding[] {
  const { sections, fullText } = ctx
  const findings: CheckFinding[] = []

  // ── ATS_CONTACT_INFO ─────────────────────────────────────────────────────
  // Contact info is essential for ATS + HR parsing
  const hasLinkSection = hasSection(ctx, 'LINK')
  const hasEmailInText = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(fullText)
  const hasPhoneInText = /(\+?98|0098|09)\d{9}|(\+\d[\d\s\-().]{6,15})/.test(fullText)

  if (!hasEmailInText && !hasLinkSection) {
    findings.push(
      finding(
        'no_email',
        'CRITICAL',
        'آدرس ایمیل وجود ندارد',
        'سیستم‌های ATS برای شناسایی متقاضی به ایمیل نیاز دارند.',
        'ایمیل حرفه‌ای خود را در بخش اطلاعات تماس یا LINK اضافه کنید.',
        'LINK',
      ),
    )
  } else {
    findings.push(
      finding('has_email', 'PASS', 'ایمیل موجود است', 'آدرس ایمیل در رزومه شناسایی شد.', undefined, 'LINK'),
    )
  }

  if (!hasPhoneInText) {
    findings.push(
      finding(
        'no_phone',
        'WARNING',
        'شماره تماس وجود ندارد',
        'اکثر آگهی‌های شغلی انتظار دارند شماره تلفن در رزومه باشد.',
        'شماره موبایل یا تلفن خود را اضافه کنید.',
        'LINK',
      ),
    )
  } else {
    findings.push(
      finding('has_phone', 'PASS', 'شماره تماس موجود است', 'شماره تماس در رزومه یافت شد.'),
    )
  }

  // ── ATS_HEADLINE ──────────────────────────────────────────────────────────
  // Target role / headline at top helps ATS categorise the resume.
  // Check both SUMMARY section text AND ctx.profile.headline (extracted from profile header).
  // Only fire the warning if BOTH are absent — avoids false positives on resumes that have
  // a clear job title in the header but no separate SUMMARY section.
  const summarySection = sections.find((s) => s.type === 'SUMMARY' && s.isVisible)
  const summaryText = (summarySection ? String(summarySection.content?.['text'] ?? '') : getSectionContent(ctx, 'SUMMARY')).trim()
  const profileHeadline = ctx.profile?.headline ?? null
  if ((!summaryText || summaryText.length < 20) && !profileHeadline) {
    findings.push(
      finding(
        'no_headline',
        'WARNING',
        'خلاصه حرفه‌ای وجود ندارد یا ناقص است',
        'سیستم‌های ATS از خلاصه برای طبقه‌بندی متقاضیان استفاده می‌کنند.',
        'یک خلاصه ۳–۵ جمله‌ای درباره تخصص و هدف شغلی بنویسید.',
        'SUMMARY',
      ),
    )
  } else if (summaryText.length > 600) {
    findings.push(
      finding(
        'summary_too_long',
        'WARNING',
        'خلاصه خیلی طولانی است',
        `خلاصه ${summaryText.length} کاراکتر دارد. توصیه می‌شود زیر ۴۰۰ کاراکتر باشد.`,
        'خلاصه را کوتاه‌تر کنید تا ATS و HR آن را سریع‌تر پردازش کنند.',
        'SUMMARY',
        summaryText.slice(0, 80) + '…',
      ),
    )
  } else {
    findings.push(
      finding('good_summary', 'PASS', 'خلاصه حرفه‌ای مناسب است', 'خلاصه موجود و با طول مناسب است.'),
    )
  }

  // ── ATS_SKILLS_SECTION ────────────────────────────────────────────────────
  const skillSection = sections.find((s) => s.type === 'SKILL' && s.isVisible)
  const hasSkills = hasSection(ctx, 'SKILL')
  if (!hasSkills) {
    findings.push(
      finding(
        'no_skills',
        'CRITICAL',
        'بخش مهارت‌ها وجود ندارد',
        'ATS سیستم‌ها اغلب بر اساس کلیدواژه‌های مهارت فیلتر می‌کنند.',
        'بخش مهارت‌های فنی خود را اضافه کنید.',
        'SKILL',
      ),
    )
  } else if (skillSection) {
    // Structured section: check position
    const visibleSections = sections.filter((s) => s.isVisible)
    const position = visibleSections.findIndex((s) => s.type === 'SKILL')
    if (position > 3) {
      findings.push(
        finding(
          'skills_not_near_top',
          'WARNING',
          'مهارت‌ها در پایین رزومه هستند',
          'سیستم‌های ATS و HR ترجیح می‌دهند مهارت‌ها زودتر ظاهر شوند.',
          'بخش مهارت‌ها را به ۳ بخش اول منتقل کنید.',
          'SKILL',
        ),
      )
    } else {
      findings.push(
        finding('skills_near_top', 'PASS', 'مهارت‌ها در موقعیت مناسب هستند', `بخش مهارت‌ها در موقعیت ${position + 1} قرار دارد.`),
      )
    }

    // Check for progress bars / rating indicators (ATS can't read them)
    const groups: unknown[] = Array.isArray(skillSection.content?.['groups'])
      ? (skillSection.content['groups'] as unknown[])
      : []
    const hasRatings = groups.some((g: unknown) => {
      if (typeof g !== 'object' || g === null) return false
      const skills = (g as Record<string, unknown>).skills
      if (!Array.isArray(skills)) return false
      return skills.some((sk: unknown) => {
        if (typeof sk !== 'object' || sk === null) return false
        return 'level' in (sk as Record<string, unknown>) || 'rating' in (sk as Record<string, unknown>)
      })
    })
    if (hasRatings) {
      findings.push(
        finding(
          'skill_ratings',
          'WARNING',
          'رتبه‌بندی مهارت‌ها برای ATS مشکل‌ساز است',
          'ATS سیستم‌ها نمودارهای مهارت یا ستاره‌بندی را نمی‌خوانند.',
          'به جای رتبه‌بندی، مهارت‌ها را به صورت گروه‌بندی‌شده ذکر کنید.',
          'SKILL',
        ),
      )
    }
  } else {
    // Detected from plain text
    findings.push(
      finding('skills_near_top', 'PASS', 'بخش مهارت‌ها شناسایی شد', 'مهارت‌ها در متن رزومه یافت شدند.'),
    )
  }

  // ── ATS_STANDARD_SECTIONS ─────────────────────────────────────────────────
  const hasExperience = hasSection(ctx, 'EXPERIENCE')
  const hasEducation = hasSection(ctx, 'EDUCATION')

  if (!hasExperience) {
    findings.push(
      finding(
        'no_experience',
        'WARNING',
        'بخش سابقه کاری وجود ندارد',
        'این بخش برای اکثر آگهی‌های شغلی الزامی است.',
        'تجربیات شغلی یا پروژه‌های حرفه‌ای خود را اضافه کنید.',
        'EXPERIENCE',
      ),
    )
  } else {
    findings.push(
      finding('has_experience', 'PASS', 'بخش سابقه کاری موجود است', 'تجربه کاری در رزومه ثبت شده است.'),
    )
  }

  if (!hasEducation) {
    findings.push(
      finding(
        'no_education',
        'INFO',
        'بخش تحصیلات وجود ندارد',
        'بسیاری از کارفرماها انتظار دارند سابقه تحصیلی ذکر شود.',
        'تحصیلات دانشگاهی یا دوره‌های مهم را اضافه کنید.',
        'EDUCATION',
      ),
    )
  }

  // ── ATS_DATES ─────────────────────────────────────────────────────────────
  const expSection = sections.find((s) => s.type === 'EXPERIENCE')
  if (expSection) {
    const entries: Record<string, unknown>[] = Array.isArray(expSection.content?.entries)
      ? (expSection.content.entries as Record<string, unknown>[])
      : Array.isArray(expSection.content?.items)
        ? (expSection.content.items as Record<string, unknown>[])
        : []

    const missingDates = entries.filter((e) => !e.startDate && !e.start_date)
    if (missingDates.length > 0) {
      findings.push(
        finding(
          'missing_dates',
          'WARNING',
          `${missingDates.length} موقعیت شغلی بدون تاریخ`,
          'ATS سیستم‌ها از تاریخ‌ها برای محاسبه سابقه استفاده می‌کنند.',
          'تاریخ شروع و پایان هر موقعیت شغلی را وارد کنید.',
          'EXPERIENCE',
        ),
      )
    } else if (entries.length > 0) {
      findings.push(
        finding('dates_present', 'PASS', 'تاریخ‌های سابقه کاری ثبت شده‌اند', 'همه موقعیت‌های شغلی دارای تاریخ هستند.'),
      )
    }
  }

  // ── ATS_PAGE_LENGTH ───────────────────────────────────────────────────────
  const wordCount = fullText.split(/\s+/).filter(Boolean).length
  if (wordCount < 100) {
    findings.push(
      finding(
        'too_short',
        'WARNING',
        'رزومه خیلی کوتاه است',
        `رزومه فقط حدود ${wordCount} کلمه دارد. حداقل ۲۰۰ کلمه توصیه می‌شود.`,
        'بخش‌های بیشتری اضافه کنید و تجربیات را توصیف کنید.',
      ),
    )
  } else if (wordCount > 1000) {
    findings.push(
      finding(
        'too_long',
        'INFO',
        'رزومه ممکن است خیلی طولانی باشد',
        `رزومه حدود ${wordCount} کلمه دارد. برای توسعه‌دهندگان با تجربه زیر ۷۰۰ کلمه توصیه می‌شود.`,
        'بخش‌های کم‌اهمیت را حذف یا خلاصه کنید.',
      ),
    )
  }

  // ── ATS_UNUSUAL_CHARS ─────────────────────────────────────────────────────
  // Check for Unicode characters that ATS parsers might mangle
  const unusualCharsMatch = fullText.match(/[★●▪▶◆■]/g)
  if (unusualCharsMatch && unusualCharsMatch.length > 5) {
    findings.push(
      finding(
        'unusual_chars',
        'INFO',
        'کاراکترهای خاص ممکن است مشکل ایجاد کنند',
        `${unusualCharsMatch.length} کاراکتر خاص یافت شد که ممکن است توسط ATS به درستی خوانده نشود.`,
        'از ساختار متنی ساده استفاده کنید.',
      ),
    )
  }

  // ── ATS_TEXT_BLOCKS ───────────────────────────────────────────────────────
  const textBlockCount = sections.filter((s) => s.type === 'TEXT_BLOCK' && s.isVisible).length
  if (textBlockCount > 0) {
    findings.push(
      finding(
        'text_blocks',
        'INFO',
        `${textBlockCount} بخش متن آزاد دارد`,
        'بخش‌های TEXT_BLOCK ممکن است توسط ATS سیستم‌ها به درستی طبقه‌بندی نشوند.',
        'تا حد ممکن از بخش‌های استاندارد (EXPERIENCE، SKILL و غیره) استفاده کنید.',
      ),
    )
  }

  return findings
}
