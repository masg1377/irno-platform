/**
 * Keyword Rules — deterministic keyword extraction and job-description matching.
 *
 * No AI. Uses:
 *   - tokenisation + stop-word removal
 *   - tech-term dictionary for normalisation (shared with career.service via keyword-match.ts)
 *   - exact + normalised-variant matching
 *   - frequency-weighted scoring
 */

import { CheckFinding, FindingSeverity, KeywordMatchResult, RuleContext } from '../types.js'
import { computeKeywordMatch, TECH_NORMALISE } from '../keyword-match.js'

function finding(
  ruleCode: string,
  severity: FindingSeverity,
  title: string,
  message: string,
  recommendation?: string,
): CheckFinding {
  return {
    id: `kw_${ruleCode}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: 'KEYWORD',
    severity,
    title,
    message,
    recommendation,
    ruleCode: `KW_${ruleCode.toUpperCase()}`,
  }
}

export function runKeywordRules(ctx: RuleContext): { findings: CheckFinding[]; keywordMatch: KeywordMatchResult | null } {
  const { fullText, jobDescription, targetRole } = ctx
  const findings: CheckFinding[] = []
  let keywordMatch: KeywordMatchResult | null = null

  // ── Typo risk for common tech terms ───────────────────────────────────────
  const TYPO_CHECKS: Array<{ pattern: RegExp; correct: string }> = [
    { pattern: /\bjavacsript\b/i, correct: 'JavaScript' },
    { pattern: /\bjavascirpt\b/i, correct: 'JavaScript' },
    { pattern: /\breacstrap\b/i, correct: 'Reactstrap' },
    { pattern: /\bweb[\s-]sockets?\b/i, correct: 'WebSocket' },
    { pattern: /\bgithube\b/i, correct: 'GitHub' },
    { pattern: /\bpostgressql\b/i, correct: 'PostgreSQL' },
    { pattern: /\bpostgresql\b/i, correct: 'PostgreSQL' }, // case check
    { pattern: /\bmongoDb\b/, correct: 'MongoDB' },
    { pattern: /\bnextJs\b/, correct: 'Next.js' },
    { pattern: /\breactJs\b/, correct: 'React' },
    { pattern: /\bnodeJs\b/, correct: 'Node.js' },
    { pattern: /\bdjanago\b/i, correct: 'Django' },
    { pattern: /\bkubernates\b/i, correct: 'Kubernetes' },
    { pattern: /\bdockers\b/i, correct: 'Docker' },
    { pattern: /\bpython3\b/i, correct: 'Python' },
  ]

  for (const check of TYPO_CHECKS) {
    const match = fullText.match(check.pattern)
    if (match && match[0] !== check.correct) {
      findings.push(
        finding(
          'typo_risk',
          'WARNING',
          `احتمال غلط املایی: «${match[0]}»`,
          `«${match[0]}» ممکن است اشتباه نوشته شده باشد. شکل صحیح: «${check.correct}»`,
          `«${match[0]}» را به «${check.correct}» تصحیح کنید.`,
        ),
      )
    }
  }

  // ── Job description keyword matching ──────────────────────────────────────
  if (jobDescription && jobDescription.trim().length > 50) {
    keywordMatch = computeKeywordMatch(fullText, jobDescription)

    if (keywordMatch.matchRate >= 70) {
      findings.push(
        finding(
          'high_keyword_match',
          'PASS',
          'تطابق کلیدواژه عالی است',
          `${keywordMatch.matchRate}% از کلیدواژه‌های آگهی در رزومه موجودند (${keywordMatch.matched.length} کلیدواژه).`,
        ),
      )
    } else if (keywordMatch.matchRate >= 40) {
      findings.push(
        finding(
          'medium_keyword_match',
          'WARNING',
          'تطابق کلیدواژه متوسط است',
          `فقط ${keywordMatch.matchRate}% از کلیدواژه‌های آگهی در رزومه موجودند.`,
          `کلیدواژه‌های غایب را به بخش‌های مرتبط اضافه کنید: ${keywordMatch.missing.slice(0, 5).join('، ')}`,
        ),
      )
    } else {
      findings.push(
        finding(
          'low_keyword_match',
          'CRITICAL',
          'تطابق کلیدواژه ضعیف است',
          `فقط ${keywordMatch.matchRate}% از کلیدواژه‌های آگهی در رزومه موجودند. این ممکن است رزومه را توسط ATS فیلتر کند.`,
          `کلیدواژه‌های مهم غایب: ${keywordMatch.missing.slice(0, 8).join('، ')}`,
        ),
      )
    }

    // Suggest specific sections for missing keywords
    if (keywordMatch.missing.length > 0) {
      const missingTech = keywordMatch.missing.filter((k) => TECH_NORMALISE[k.toLowerCase()])
      if (missingTech.length > 0) {
        findings.push(
          finding(
            'missing_tech_keywords',
            'INFO',
            'فناوری‌های مطرح در آگهی موجود نیستند',
            `این فناوری‌ها در آگهی ذکر شده‌اند اما در رزومه یافت نشدند: ${missingTech.slice(0, 6).join('، ')}`,
            'اگر با این فناوری‌ها آشنا هستید، آن‌ها را به بخش مهارت‌ها اضافه کنید. اگر آشنا نیستید، آموزش را شروع کنید.',
          ),
        )
      }
    }
  } else if (targetRole && !jobDescription) {
    // Role-based keyword suggestions (without full JD)
    const roleKeywords = getRoleKeywords(targetRole)
    if (roleKeywords.length > 0) {
      const resumeLower = fullText.toLowerCase()
      const missing = roleKeywords.filter((k) => !resumeLower.includes(k.toLowerCase()))
      if (missing.length > 3) {
        findings.push(
          finding(
            'role_keywords_missing',
            'INFO',
            'کلیدواژه‌های رایج برای موقعیت هدف وجود ندارند',
            `برای موقعیت «${targetRole}» معمولاً این مهارت‌ها انتظار می‌رود: ${missing.slice(0, 6).join('، ')}`,
            'آگهی شغلی هدف خود را در بخش «بررسی با آگهی شغلی» وارد کنید تا تحلیل دقیق‌تری دریافت کنید.',
          ),
        )
      }
    }
  }

  return { findings, keywordMatch }
}

function getRoleKeywords(targetRole: string): string[] {
  const lower = targetRole.toLowerCase()
  if (lower.includes('frontend') || lower.includes('react')) {
    return ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Git', 'REST API']
  }
  if (lower.includes('backend') || lower.includes('node')) {
    return ['Node.js', 'TypeScript', 'PostgreSQL', 'REST API', 'Docker', 'Git']
  }
  if (lower.includes('fullstack') || lower.includes('full stack')) {
    return ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST API', 'Git', 'Docker']
  }
  if (lower.includes('mobile') || lower.includes('react native')) {
    return ['React Native', 'JavaScript', 'TypeScript', 'Expo', 'Git']
  }
  if (lower.includes('python') || lower.includes('django') || lower.includes('fastapi')) {
    return ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'REST API', 'Docker', 'Git']
  }
  if (lower.includes('devops')) {
    return ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'AWS', 'Git', 'Nginx']
  }
  return []
}
