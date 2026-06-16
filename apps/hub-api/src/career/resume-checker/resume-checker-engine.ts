/**
 * Resume Checker Engine — orchestrates all rule modules and computes final scores.
 *
 * Architecture:
 *   - Each rule module returns CheckFinding[]
 *   - Engine computes 9 dimension scores from finding patterns
 *   - roleMatchScore is only set when jobDescription is provided
 *   - overallScore is a weighted average of all dimension scores
 *
 * This is deterministic, rule-based analysis only.
 * AI-powered analysis is a future feature.
 */

import { runAtsRules } from './rules/ats.rules.js'
import { runHrScanRules } from './rules/hr-scan.rules.js'
import { runStructureRules } from './rules/structure.rules.js'
import { runAchievementRules } from './rules/achievement.rules.js'
import { runKeywordRules } from './rules/keyword.rules.js'
import { runFormattingRules } from './rules/formatting.rules.js'
import { runCompletenessRules } from './rules/completeness.rules.js'
import { runReadabilityRules } from './rules/readability.rules.js'
import {
  CheckFinding,
  CheckSuggestion,
  DetectedSection,
  DetectionMethod,
  KeywordMatchResult,
  ParserDiagnostics,
  RuleContext,
  ResumeProfileHeader,
  ScoreCard,
  ResumeSection,
} from './types.js'
// Re-export helpers so existing importers of the engine still work
export { hasSection, getSectionContent, countSections } from './helpers.js'

export interface EngineResult {
  findings: CheckFinding[]
  suggestions: CheckSuggestion[]
  scores: ScoreCard
  keywordMatch: KeywordMatchResult | null
  diagnostics: ParserDiagnostics
}

// ── Score weight configuration ────────────────────────────────────────────
const SCORE_WEIGHTS: Record<keyof Omit<ScoreCard, 'overallScore' | 'roleMatchScore'>, number> = {
  completenessScore: 0.22,
  atsScore:          0.20,
  hrScanScore:       0.15,
  structureScore:    0.12,
  achievementScore:  0.12,
  keywordScore:      0.10,
  readabilityScore:  0.05,
  formattingRiskScore: 0.04,
}

// ── Severity penalty weights for score computation ────────────────────────
const PENALTY: Record<string, number> = {
  CRITICAL: 20,
  WARNING:  8,
  INFO:     2,
  PASS:     0,
}

function computeDimensionScore(
  findings: CheckFinding[],
  category: string,
  baseScore = 100,
): number {
  const relevant = findings.filter((f) => f.category === category)
  let score = baseScore

  for (const f of relevant) {
    if (f.severity !== 'PASS') {
      score -= PENALTY[f.severity] ?? 0
    }
  }

  // PASS findings give small bonuses (up to +10)
  const passCount = relevant.filter((f) => f.severity === 'PASS').length
  score += Math.min(passCount * 3, 10)

  return Math.max(0, Math.min(100, Math.round(score)))
}

function buildSuggestions(findings: CheckFinding[]): CheckSuggestion[] {
  const suggestions: CheckSuggestion[] = []
  let priority = 1

  // CRITICAL findings first
  const criticals = findings.filter((f) => f.severity === 'CRITICAL')
  for (const f of criticals) {
    if (f.recommendation) {
      suggestions.push({
        priority: priority++,
        category: f.category,
        title: f.title,
        action: f.recommendation,
        impact: 'HIGH',
      })
    }
  }

  // HIGH-impact WARNINGs
  const highImpactCategories = ['ATS', 'COMPLETENESS', 'HR_SCAN']
  const warnings = findings.filter(
    (f) => f.severity === 'WARNING' && highImpactCategories.includes(f.category),
  )
  for (const f of warnings) {
    if (f.recommendation) {
      suggestions.push({
        priority: priority++,
        category: f.category,
        title: f.title,
        action: f.recommendation,
        impact: 'HIGH',
      })
    }
  }

  // Other WARNINGs
  const otherWarnings = findings.filter(
    (f) => f.severity === 'WARNING' && !highImpactCategories.includes(f.category),
  )
  for (const f of otherWarnings) {
    if (f.recommendation) {
      suggestions.push({
        priority: priority++,
        category: f.category,
        title: f.title,
        action: f.recommendation,
        impact: 'MEDIUM',
      })
    }
  }

  // INFO improvements
  const infos = findings.filter((f) => f.severity === 'INFO' && f.recommendation)
  for (const f of infos.slice(0, 5)) {
    suggestions.push({
      priority: priority++,
      category: f.category,
      title: f.title,
      action: f.recommendation!,
      impact: 'LOW',
    })
  }

  return suggestions.slice(0, 20) // max 20 suggestions
}

// ── Section heading aliases ─────────────────────────────────────────────────
// Maps canonical section type → list of heading aliases (lower-case, no punctuation).
// Two forms per alias:
//   - WITH spaces:    "about me", "work experience"
//   - WITHOUT spaces: "aboutme", "workexperience"  (PDF concatenation artifact)
// The normaliser strips spaces before matching, so both forms resolve.
const SECTION_ALIASES: Record<string, string[]> = {
  SUMMARY: [
    'about me', 'about', 'profile', 'professional profile', 'professional summary',
    'career summary', 'career objective', 'objective', 'personal statement',
    'introduction', 'overview', 'background', 'summary',
    // Concatenated / no-space variants (PDF font encoding artifacts)
    'aboutme', 'professionalprofile', 'professionalsummary', 'careersummary',
    'careerobjectiveintroduction', 'personalstatement',
    'خلاصه', 'خلاصه حرفه‌ای', 'درباره من', 'معرفی', 'پروفایل حرفه‌ای', 'پروفایل',
  ],
  EXPERIENCE: [
    'experience', 'work experience', 'professional experience', 'employment',
    'employment history', 'work history', 'career history', 'positions',
    // Concatenated variants
    'workexperience', 'professionalexperience', 'employmenthistory',
    'سوابق کاری', 'تجربه کاری', 'تجربیات حرفه‌ای', 'سابقه کاری',
  ],
  EDUCATION: [
    'education', 'academic background', 'academics', 'academic history',
    'university', 'qualifications', 'academic qualifications',
    // Concatenated variants
    'academicbackground', 'academichistory', 'academicqualifications',
    'تحصیلات', 'سوابق تحصیلی', 'دانشگاه', 'آموزش',
  ],
  SKILL: [
    'skills', 'technical skills', 'core skills', 'key skills',
    'technologies', 'tech stack', 'tools & technologies', 'tools and technologies',
    'programming skills', 'computer skills', 'technical expertise',
    // Concatenated variants
    'technicalskills', 'coreskills', 'keyskills', 'programmingskills',
    'computerskills', 'technicalexpertise', 'toolsandtechnologies',
    'مهارت‌ها', 'مهارت‌های فنی', 'مهارت های فنی', 'تکنولوژی‌ها', 'ابزارها', 'مهارت‌های اصلی',
  ],
  PROJECT: [
    'projects', 'selected projects', 'key projects', 'portfolio',
    'case studies', 'personal projects', 'side projects', 'open source',
    // Concatenated variants
    'selectedprojects', 'keyprojects', 'casestudies', 'personalprojects',
    'sideprojects', 'opensource',
    'پروژه‌ها', 'نمونه‌کارها', 'پروژه‌های منتخب',
  ],
  CERTIFICATE: [
    'certifications', 'certificates', 'licenses', 'credentials',
    'courses',
    // NOTE: 'training' intentionally removed — too generic, matches achievement bullets
    // like "Led training sessions..." causing false CERTIFICATE heading detection.
    'مدارک', 'گواهی‌ها', 'گواهینامه‌ها', 'دوره‌ها',
  ],
  LANGUAGE: [
    'languages', 'language skills', 'language proficiency',
    // Concatenated variants
    'languageskills', 'languageproficiency',
    'زبان‌ها', 'زبان‌های خارجی',
  ],
}

// Skill group sub-labels — when these appear inside a skill section, they are sub-groups
const SKILL_GROUP_LABELS = [
  'frameworks', 'libraries', 'languages', 'tools', 'databases', 'cloud',
  'devops', 'testing', 'frontend', 'backend', 'mobile', 'interpersonal skills',
  'soft skills', 'technical skills', 'methodologies',
]

// Education content patterns
const EDUCATION_PATTERNS = [
  /\bB\.?Sc\.?\b/i, /\bM\.?Sc\.?\b/i, /\bBachelor\b/i, /\bMaster\b/i,
  /\bPh\.?D\.?\b/i, /\bAssociate\b/i, /\bUniversity\b/i, /\bCollege\b/i,
  /\bInstitute\b/i, /کارشناسی/, /کارشناسی ارشد/, /دکترا/, /دانشگاه/,
]

// Experience content patterns
const EXPERIENCE_PATTERNS = [
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b.*\b(20\d\d|19\d\d)\b/i,
  /\b(january|february|march|april|june|july|august|september|october|november|december)\b/i,
  /\b20\d\d\s*[–\-—]\s*(20\d\d|present|current|now)\b/i,
  /\bDate:\s*\w/i,
  /\bLocation:\s*\w/i,
  /•\s*\w{3,}/,  // bullet points
]

// Project content patterns
const PROJECT_PATTERNS = [
  /\bWebsite:\s*https?:/i,
  /\bgithub\.com\//i,
  /\bNextJS\b|\bNext\.js\b|\bReact\b|\bVue\b|\bAngular\b/,
  /\bReal[ -]?estate\b|\bE[-\s]?commerce\b|\bplatform\b/i,
]

/**
 * Normalise a heading string for alias lookup.
 * Removes trailing colon, trims, lowercases.
 */
function normaliseHeading(h: string): string {
  return h.replace(/:$/, '').trim().toLowerCase()
}

/**
 * Normalise without any whitespace — for matching concatenated PDF artifacts
 * like "ABOUTME", "TECHNICALSKILLS", "WORKEXPERIENCE".
 */
function normaliseHeadingCompact(h: string): string {
  return h.replace(/:$/, '').replace(/\s+/g, '').trim().toLowerCase()
}

// Action verbs that start achievement bullets — these lines are NEVER section headings.
const ACHIEVEMENT_VERB_RE = /^(Reduced|Delivered|Led|Developed|Implemented|Improved|Collaborated|Built|Created|Managed|Designed|Architected|Maintained|Deployed|Launched|Drove|Increased|Decreased|Optimized|Spearheaded|Established|Oversaw|Coordinated|Executed|Mentored|Trained|Supported|Worked|Contributed|Achieved|Resolved|Migrated|Refactored|Integrated|Automated|Monitored|Analyzed|Reviewed|Performed|Assisted|Handled|Conducted|Prepared|Delivered)\b/i

/**
 * Check if a line looks like a section heading.
 *
 * Heuristics used (in order of reliability):
 *   1. Ends with ':' and is short — "Frameworks:", "Technical Skills:"
 *   2. All-uppercase and short (≤5 words) — "EXPERIENCE", "ABOUT ME", "ABOUTME"
 *   3. Exact alias match (with or without spaces) — covers title-case and concatenated headings
 *
 * REMOVED: Partial alias match (`norm.includes(alias)` / `alias.includes(norm)`)
 * — this caused severe false positives: any line containing "experience", "project",
 *   "training", etc. was wrongly classified as a section heading. For example:
 *   "Frontend Developer with 6+ years of experience" → matched EXPERIENCE alias
 *   "Led training sessions for junior engineers" → matched CERTIFICATE alias 'training'
 *   "Reduced project size by 40%" → matched PROJECT alias 'project'
 *
 * Rejection guards are applied FIRST to catch content lines before any heading check.
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 80) return false

  // ── Structural exclusions ────────────────────────────────────────────────────
  if (/^[•·\-\*✓▸▪→◆]\s/.test(trimmed)) return false   // bullet point
  if (/^\d+[.)]\s/.test(trimmed)) return false            // numbered list item
  if (/[.,;!?]$/.test(trimmed)) return false              // ends with sentence punctuation

  // ── Content-line rejection guards ────────────────────────────────────────────
  // Lines with percentage metrics are achievement bullets, not headings
  if (/\d+\s*%/.test(trimmed)) return false
  // "N+ years of experience" — biographical phrasing, not a heading
  if (/\d+\+?\s*years?\s*(of\s*)?(experience|work)/i.test(trimmed)) return false
  // Lines starting with achievement/action verbs are work bullets
  if (ACHIEVEMENT_VERB_RE.test(trimmed)) return false

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length

  // ── Strong signals ───────────────────────────────────────────────────────────
  // Ends with colon (group labels and sub-headings)
  if (trimmed.endsWith(':') && trimmed.length < 50) return true

  // All-uppercase short text (EXPERIENCE, ABOUT ME, ABOUTME) — limit to ≤5 words
  const withoutSpaces = trimmed.replace(/[\s&\-–—/]/g, '')
  if (
    withoutSpaces.length >= 3 &&
    withoutSpaces.length <= 30 &&
    withoutSpaces === withoutSpaces.toUpperCase() &&
    /[A-Z]/.test(withoutSpaces) &&
    wordCount <= 5
  ) return true

  // ── Alias match — exact only ────────────────────────────────────────────────
  const norm = normaliseHeading(trimmed)
  for (const aliases of Object.values(SECTION_ALIASES)) {
    if (aliases.includes(norm)) return true
  }

  // Alias match — without spaces (concatenated PDF artifact: "ABOUTME", "TECHNICALSKILLS")
  const compact = normaliseHeadingCompact(trimmed)
  if (compact.length >= 4) {
    for (const aliases of Object.values(SECTION_ALIASES)) {
      if (aliases.some((a) => a.replace(/\s+/g, '') === compact)) return true
    }
  }

  return false
}

/**
 * Given a heading line, return the canonical section type and confidence.
 * Uses EXACT match only — partial/substring matching was removed to prevent
 * misclassifying content lines (e.g. "Led training sessions" → CERTIFICATE).
 */
function classifyHeading(heading: string): { type: string; confidence: number; method: DetectionMethod } | null {
  const norm = normaliseHeading(heading)
  const normNoColon = norm.replace(/:$/, '').trim()
  const compact = normaliseHeadingCompact(heading)

  for (const [type, aliases] of Object.entries(SECTION_ALIASES)) {
    // Exact match (with spaces)
    if (aliases.includes(norm) || aliases.includes(normNoColon)) {
      return { type, confidence: 90, method: 'ALIAS' }
    }
    // Compact match (without spaces — PDF concatenation artifact)
    if (compact.length >= 4 && aliases.some((a) => a.replace(/\s+/g, '') === compact)) {
      return { type, confidence: 80, method: 'ALIAS' }
    }
  }
  return null
}

/**
 * Detect sections from raw resume plain text.
 * Used when ctx.sections is empty (uploaded file or pasted text).
 *
 * Algorithm:
 * 1. Split into lines
 * 2. Identify heading lines via alias dictionary + heuristics
 * 3. Group content between headings
 * 4. Classify each group by heading or content patterns
 * 5. Return DetectedSection[] sorted by start line
 */
export function detectSectionsFromText(text: string): DetectedSection[] {
  if (!text || text.trim().length < 30) return []

  const lines = text.split(/\n/)
  const segments: Array<{ heading: string; startLine: number; contentLines: string[] }> = []

  let currentHeading = ''
  let currentStart = 0
  let currentContent: string[] = []

  // --- Pass 1: identify heading boundaries ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isHeadingLine(line)) {
      if (currentHeading || currentContent.some((l) => l.trim())) {
        segments.push({
          heading: currentHeading,
          startLine: currentStart,
          contentLines: currentContent,
        })
      }
      currentHeading = line.trim()
      currentStart = i
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  // Push last segment
  if (currentHeading || currentContent.some((l) => l.trim())) {
    segments.push({ heading: currentHeading, startLine: currentStart, contentLines: currentContent })
  }

  // --- Pass 2: classify each segment ---
  const detected: DetectedSection[] = []
  const firstSegmentIsIntro = segments.length > 0 && !segments[0].heading

  // Collect skill sub-group content for later merging into the parent SKILL section.
  // Sub-groups are lines like "Frameworks:", "Languages:", "Technical Skills:".
  const skippedSkillContent: string[] = []

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]
    const content = seg.contentLines.join('\n').trim()
    const endLine = si + 1 < segments.length ? segments[si + 1].startLine - 1 : lines.length - 1

    // Classify by heading
    if (seg.heading) {
      const normH = normaliseHeading(seg.heading)

      // ── Check if this is a skill sub-group FIRST ──────────────────────────
      // Skill sub-groups are headings whose normalised text is in SKILL_GROUP_LABELS.
      // Check BEFORE alias classification so that "Languages:", which is in SECTION_ALIASES.LANGUAGE,
      // gets collected as a skill sub-group rather than creating a spurious LANGUAGE section.
      if (SKILL_GROUP_LABELS.some((gl) => normH === gl || normH === `${gl}:`)) {
        // Collect: "Frameworks:\nReact, Next.js, Vue.js"
        const groupEntry = seg.heading.trim() + (content ? '\n' + content : '')
        skippedSkillContent.push(groupEntry)
        continue
      }

      const classified = classifyHeading(seg.heading)
      if (classified) {
        detected.push({
          type: classified.type,
          titleDetected: seg.heading,
          confidence: classified.confidence,
          detectionMethod: classified.method,
          content,
          startLine: seg.startLine,
          endLine,
        })
        continue
      }

      // Heading not in alias dict — try content patterns
      const contentClassified = classifyByContentPattern(content, seg.heading)
      if (contentClassified) {
        detected.push({
          type: contentClassified.type,
          titleDetected: seg.heading,
          confidence: contentClassified.confidence,
          detectionMethod: 'CONTENT_PATTERN',
          content,
          startLine: seg.startLine,
          endLine,
        })
      }
    } else if (si === 0 && firstSegmentIsIntro && content.length > 30) {
      // First unnamed segment — check if it looks like a summary/intro
      const professionalPhrases = [
        /developer with \d+/i, /experienced in\b/i, /specialized in\b/i,
        /\d+\+?\s*years?\s*(of\s*)?(experience|working)/i,
        /frontend|backend|fullstack|react|software/i,
        /متخصص|تجربه|مهارت|سابقه/,
      ]
      const looksLikeSummary = professionalPhrases.some((p) => p.test(content))
      if (looksLikeSummary) {
        detected.push({
          type: 'SUMMARY',
          titleDetected: '(inferred)',
          confidence: 55,
          detectionMethod: 'POSITIONAL',
          content,
          startLine: seg.startLine,
          endLine,
        })
      }
    }
  }

  // ── Merge skill sub-group content into parent SKILL section ──────────────
  // Sub-groups (Frameworks:, Languages:, etc.) were collected during Pass 2.
  // Their content must be appended to the SKILL section found by the main heading.
  if (skippedSkillContent.length > 0) {
    const skillSection = detected.find((d) => d.type === 'SKILL')
    if (skillSection) {
      skillSection.content = [skillSection.content, ...skippedSkillContent]
        .filter(Boolean)
        .join('\n')
    } else {
      // No parent SKILL section detected by heading — create one from sub-groups
      detected.push({
        type: 'SKILL',
        titleDetected: '(grouped labels)',
        confidence: 85,
        detectionMethod: 'CONTENT_PATTERN',
        content: skippedSkillContent.join('\n'),
        startLine: 0,
        endLine: lines.length - 1,
      })
    }
  }

  // --- Pass 3: content-pattern detection for sections not yet found ---
  const foundTypes = new Set(detected.map((d) => d.type))

  // Education by content pattern (even without heading)
  if (!foundTypes.has('EDUCATION')) {
    const fullContent = text
    const educMatch = EDUCATION_PATTERNS.filter((p) => p.test(fullContent))
    if (educMatch.length >= 2) {
      detected.push({
        type: 'EDUCATION',
        titleDetected: '(pattern)',
        confidence: 60,
        detectionMethod: 'CONTENT_PATTERN',
        content: '',
        startLine: 0,
        endLine: 0,
      })
    }
  }

  // Experience by bullet+date pattern
  if (!foundTypes.has('EXPERIENCE')) {
    const expPatternMatches = EXPERIENCE_PATTERNS.filter((p) => p.test(text))
    if (expPatternMatches.length >= 2) {
      detected.push({
        type: 'EXPERIENCE',
        titleDetected: '(pattern)',
        confidence: 65,
        detectionMethod: 'CONTENT_PATTERN',
        content: '',
        startLine: 0,
        endLine: 0,
      })
    }
  }

  // --- Pass 4: collapse-recovery for whole-resume-as-SUMMARY ─────────────────
  // If only one inferred SUMMARY was detected AND it has large content, the parser
  // likely failed to split the text (e.g. due to insufficient newlines from PDF).
  // Attempt a secondary scan: look for known heading tokens embedded in the content.
  if (
    detected.length === 1 &&
    detected[0].type === 'SUMMARY' &&
    detected[0].detectionMethod === 'POSITIONAL' &&
    detected[0].content.length > 500
  ) {
    const collapsedContent = detected[0].content
    const recovered = recoverSectionsFromCollapsedText(collapsedContent)
    if (recovered.length > 1) {
      // Secondary scan found real sections — replace the inferred SUMMARY
      return recovered.sort((a, b) => a.startLine - b.startLine)
    }
  }

  return detected.sort((a, b) => a.startLine - b.startLine)
}

/**
 * Recovery scanner: used when text has no newlines and all content collapses
 * into one segment. Scans for known section heading tokens embedded in the text
 * and splits around them.
 *
 * This handles PDFs where Td/Tm operators were not emitted with newlines by
 * older extraction code, OR where heading text is run together without spaces.
 */
function recoverSectionsFromCollapsedText(text: string): DetectedSection[] {
  // Build a combined pattern of all alias tokens (sorted longest-first for greedy matching)
  const allAliases: Array<{ type: string; alias: string }> = []
  for (const [type, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      // Only include aliases with ≥ 4 chars and no special regex chars
      if (alias.length >= 4 && /^[\w\s\-'‌]+$/.test(alias)) {
        allAliases.push({ type, alias })
      }
    }
  }
  // Sort longest first so longer aliases take priority over shorter ones
  allAliases.sort((a, b) => b.alias.length - a.alias.length)

  // Find all alias positions in the collapsed text
  const boundaries: Array<{ pos: number; type: string; alias: string }> = []
  const textLower = text.toLowerCase()

  for (const { type, alias } of allAliases) {
    // Match both spaced and compact forms
    const forms = [alias, alias.replace(/\s+/g, '')]
    for (const form of forms) {
      if (form.length < 4) continue
      let idx = textLower.indexOf(form)
      while (idx >= 0) {
        // Avoid overlapping with already-found boundaries
        const overlaps = boundaries.some(
          (b) => Math.abs(b.pos - idx) < 5,
        )
        if (!overlaps) {
          boundaries.push({ pos: idx, type, alias: form })
        }
        idx = textLower.indexOf(form, idx + form.length)
      }
    }
  }

  if (boundaries.length < 2) return [] // not enough headings found — give up

  // Sort by position
  boundaries.sort((a, b) => a.pos - b.pos)

  // Build detected sections from boundaries
  const recovered: DetectedSection[] = []
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i]
    const nextPos = i + 1 < boundaries.length ? boundaries[i + 1].pos : text.length
    const contentStart = b.pos + b.alias.length
    const content = text.slice(contentStart, nextPos).trim()

    recovered.push({
      type: b.type,
      titleDetected: `(recovered: ${b.alias})`,
      confidence: 65,
      detectionMethod: 'CONTENT_PATTERN',
      content,
      startLine: b.pos,
      endLine: nextPos,
    })
  }

  return recovered
}

function classifyByContentPattern(
  content: string,
  _heading: string,
): { type: string; confidence: number } | null {
  if (EDUCATION_PATTERNS.filter((p) => p.test(content)).length >= 2) {
    return { type: 'EDUCATION', confidence: 65 }
  }
  if (EXPERIENCE_PATTERNS.filter((p) => p.test(content)).length >= 2) {
    return { type: 'EXPERIENCE', confidence: 65 }
  }
  if (PROJECT_PATTERNS.filter((p) => p.test(content)).length >= 2) {
    return { type: 'PROJECT', confidence: 65 }
  }
  const groupLabelPattern = new RegExp(
    `(${SKILL_GROUP_LABELS.join('|')})\\s*:`,
    'i',
  )
  if (groupLabelPattern.test(content)) {
    return { type: 'SKILL', confidence: 75 }
  }
  return null
}

// hasSection, getSectionContent, and countSections are re-exported from ./helpers.js above

/**
 * Extract the profile header from the top lines of the resume text.
 * Looks for name, job title/headline, email, and phone before the first section heading.
 * Used to prevent false ATS/HR positives when the resume has a professional header
 * but no separate SUMMARY section.
 */
export function extractProfileHeader(text: string): ResumeProfileHeader {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // Find where sections start — look for first actual section heading
  const firstSectionIdx = lines.findIndex((l) => isHeadingLine(l))
  const headerLines = firstSectionIdx > 0
    ? lines.slice(0, Math.min(firstSectionIdx, 8))
    : lines.slice(0, 5)

  // Extract email from full text
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  // Extract phone — supports international and Iranian formats
  const phoneMatch = text.match(/(?:\+?98[-\s]?|0)9\d{9}|\+?\d[\d\s\-()]{9,15}/)

  // Name: first non-blank header line with reasonable length and no special chars
  const name = headerLines[0] && headerLines[0].length >= 2 && headerLines[0].length < 80
    && !headerLines[0].includes('@') ? headerLines[0] : null

  // Headline: second or third header line that looks like a job title
  // — not an email, not a phone, not a URL, not a heading itself, not blank
  const headline = headerLines
    .slice(1)
    .find((l) =>
      l.length >= 5 &&
      l.length < 150 &&
      !l.includes('@') &&
      !/^[\+\d\s\-()]+$/.test(l) &&
      !/^https?:\/\//.test(l) &&
      !isHeadingLine(l),
    ) ?? null

  return {
    name,
    headline,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
  }
}

// ── Known tech terms dictionary ────────────────────────────────────────────
// Used for comprehensive skill extraction from resume text when group labels are absent.
// Sorted longest-first so longer multi-word terms match before shorter components.
const KNOWN_TECH_TERMS: Array<{ term: string; pattern: RegExp }> = (
  [
    // Frontend frameworks/libraries
    'React Native', 'React.js', 'ReactJS', 'React',
    'Next.js', 'NextJS', 'Nuxt.js', 'NuxtJS',
    'Vue.js', 'VueJS', 'Vue',
    'Angular',
    'Svelte', 'SvelteKit',
    'Remix',
    // Backend
    'Node.js', 'NodeJS',
    'NestJS', 'Express.js', 'Express', 'Fastify', 'Hapi',
    'Django', 'Flask', 'FastAPI',
    'Spring Boot', 'Spring',
    'Laravel', 'Symfony',
    'Ruby on Rails',
    // Languages
    'TypeScript', 'JavaScript', 'ES6', 'ES2015',
    'Python', 'Java', 'Kotlin', 'Swift', 'Go', 'Rust', 'C#', 'C++', 'PHP',
    // Mobile
    'Flutter', 'Expo',
    // Databases
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Cassandra', 'Elasticsearch',
    // ORM/ODM
    'Prisma', 'TypeORM', 'Sequelize', 'Mongoose',
    // APIs
    'GraphQL', 'REST', 'tRPC', 'gRPC', 'WebSocket', 'Socket.io',
    // Cloud/DevOps
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Vercel', 'Netlify',
    'GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI', 'Terraform', 'Ansible',
    // Version control
    'GitHub', 'GitLab', 'Bitbucket', 'Git',
    // CSS/Styling
    'TailwindCSS', 'Tailwind', 'SCSS', 'Sass', 'CSS3', 'CSS',
    'Material UI', 'Ant Design', 'Chakra UI', 'shadcn/ui',
    'Bootstrap', 'Styled Components',
    // Build tools
    'Webpack', 'Vite', 'Rollup', 'Babel', 'esbuild', 'Turbopack',
    // Testing
    'Playwright', 'Cypress', 'Vitest', 'Jest', 'RTL', 'Storybook',
    // State management
    'Redux Toolkit', 'Redux', 'Zustand', 'MobX', 'Recoil', 'Jotai',
    'React Query', 'TanStack Query', 'SWR',
    // Other
    'HTML5', 'HTML',
    'Linux', 'Bash', 'Shell',
    'Figma', 'Adobe XD',
    'Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence',
    'Firebase', 'Supabase', 'PocketBase',
    'Stripe', 'Twilio', 'SendGrid',
    // Persian tech terms
    'ری‌اکت', 'جاوا اسکریپت', 'تایپ اسکریپت', 'پایتون',
  ] as string[]
).map((term) => ({
  term,
  pattern: new RegExp(
    `(?:^|[\\s,;/•·])${term.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}(?:[\\s,;/•·]|$)`,
    'i',
  ),
}))

/**
 * Extract all skill tokens from the full text when skills section is detected.
 *
 * Three extraction strategies (applied in order, results de-duplicated):
 *   1. Group label lines: "Frameworks: React, Next.js, TypeScript"
 *   2. Group label + next line: "Frameworks:\nReact, Next.js"
 *   3. Tech term dictionary scan: finds any known tech term anywhere in the text
 *
 * Strategy 3 ensures comprehensive coverage even when group labels are absent or
 * skills are embedded in bullet points/experience descriptions.
 */
export function extractSkillsFromText(text: string): string[] {
  const skills: string[] = []

  const GROUP_LABEL_RE = /(?:frameworks?|libraries|languages?|tools?|databases?|cloud|devops|testing|frontend|backend|mobile|interpersonal skills?|soft skills?|technical skills?|technologies|methodologies)/i

  const lines = text.split(/\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Strategy 1: "GroupLabel: Skill1, Skill2, ..." (skills on same line)
    const inlineMatch = line.match(
      /^[^:]{0,40}(?:frameworks?|libraries|languages?|tools?|databases?|cloud|devops|testing|frontend|backend|mobile|interpersonal skills?|soft skills?|technical skills?|technologies|methodologies)\s*:\s*(.+)/i,
    )
    if (inlineMatch && inlineMatch[1].trim().length > 0) {
      const items = inlineMatch[1]
        .split(/[,;|•]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 60)
      skills.push(...items)
      continue
    }

    // Strategy 2: "GroupLabel:" on its own line, followed by skills on the next line
    if (line.endsWith(':') && GROUP_LABEL_RE.test(line)) {
      const nextLine = lines[i + 1]?.trim() ?? ''
      if (nextLine.length > 0 && !nextLine.endsWith(':')) {
        const items = nextLine
          .split(/[,;|•]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 60)
        skills.push(...items)
        i++ // skip the skills line in the outer loop
      }
    }
  }

  // Strategy 3: scan full text for known tech terms (comprehensive coverage)
  // This catches skills mentioned in experience bullets, project descriptions,
  // or skills sections that lack group labels.
  for (const { term, pattern } of KNOWN_TECH_TERMS) {
    if (pattern.test(text)) {
      skills.push(term)
    }
  }

  // Normalise and de-duplicate
  return [...new Set(skills.filter(Boolean))].sort()
}

/** Convert raw section data (from Prisma / plain object) into typed RuleContext sections */
export function normaliseSections(rawSections: unknown[]): ResumeSection[] {
  return rawSections
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      type: String(s['type'] ?? ''),
      title: String(s['title'] ?? ''),
      sortOrder: Number(s['sortOrder'] ?? s['sort_order'] ?? 0),
      isVisible: Boolean(s['isVisible'] ?? s['is_visible'] ?? true),
      content: (s['content'] as Record<string, unknown>) ?? {},
    }))
}

/** Build fullText from structured Irno resume sections */
export function sectionsToText(sections: ResumeSection[]): string {
  const parts: string[] = []

  for (const sec of sections.filter((s) => s.isVisible)) {
    const c = sec.content

    switch (sec.type) {
      case 'SUMMARY':
      case 'TEXT_BLOCK':
      case 'CUSTOM':
        if (c['text']) parts.push(String(c['text']))
        break

      case 'EXPERIENCE': {
        const entries: Record<string, unknown>[] =
          (c['entries'] as Record<string, unknown>[]) ??
          (c['items'] as Record<string, unknown>[]) ??
          []
        for (const e of entries) {
          if (e['role']) parts.push(String(e['role']))
          if (e['company']) parts.push(String(e['company']))
          if (e['description']) parts.push(String(e['description']))
          const achievements: string[] = (e['achievements'] as string[]) ?? (e['bullets'] as string[]) ?? []
          parts.push(...achievements)
        }
        break
      }

      case 'EDUCATION': {
        const items: Record<string, unknown>[] = (c['items'] as Record<string, unknown>[]) ?? []
        for (const e of items) {
          if (e['institution']) parts.push(String(e['institution']))
          if (e['degree']) parts.push(String(e['degree']))
          if (e['field']) parts.push(String(e['field']))
        }
        break
      }

      case 'PROJECT': {
        const items: Record<string, unknown>[] = (c['items'] as Record<string, unknown>[]) ?? []
        for (const p of items) {
          if (p['title']) parts.push(String(p['title']))
          if (p['description']) parts.push(String(p['description']))
          if (p['role']) parts.push(String(p['role']))
          const techs: string[] = (p['technologies'] as string[]) ?? []
          parts.push(...techs)
          const features: string[] = (p['features'] as string[]) ?? []
          parts.push(...features)
        }
        break
      }

      case 'SKILL': {
        const groups: Record<string, unknown>[] = (c['groups'] as Record<string, unknown>[]) ?? []
        for (const g of groups) {
          const skills: string[] = (g['skills'] as string[]) ?? []
          parts.push(...skills)
        }
        const flatSkills: string[] = (c['skills'] as string[]) ?? []
        parts.push(...flatSkills)
        break
      }

      case 'CERTIFICATE': {
        const items: Record<string, unknown>[] = (c['items'] as Record<string, unknown>[]) ?? []
        for (const cert of items) {
          if (cert['title']) parts.push(String(cert['title']))
          if (cert['issuer']) parts.push(String(cert['issuer']))
        }
        break
      }

      case 'LANGUAGE': {
        const items: Record<string, unknown>[] = (c['items'] as Record<string, unknown>[]) ?? []
        for (const lang of items) {
          if (lang['language']) parts.push(String(lang['language']))
        }
        break
      }

      case 'LINK': {
        const items: Record<string, unknown>[] = (c['items'] as Record<string, unknown>[]) ?? []
        for (const link of items) {
          if (link['label']) parts.push(String(link['label']))
          if (link['url']) parts.push(String(link['url']))
        }
        break
      }
    }
  }

  return parts.filter(Boolean).join(' ')
}

/** Build parser diagnostics from the detected sections, extracted skills, and profile header */
function buildDiagnostics(
  fullText: string,
  detectedSections: DetectedSection[],
  profile: ResumeProfileHeader,
): ParserDiagnostics {
  const extractedSkills = extractSkillsFromText(fullText)
  const warnings: string[] = []

  for (const sec of detectedSections) {
    if (sec.confidence < 60) {
      warnings.push(
        `«${sec.titleDetected}» با اطمینان پایین (${sec.confidence}%) به عنوان «${sec.type}» تشخیص داده شد.`,
      )
    }
    if (sec.content.length < 10 && sec.detectionMethod !== 'CONTENT_PATTERN') {
      warnings.push(`بخش «${sec.type}» شناسایی شد اما محتوای متنی کمی دارد.`)
    }
  }

  // Warn if important sections are missing
  const foundTypes = new Set(detectedSections.map((d) => d.type))
  const critical = ['SUMMARY', 'EXPERIENCE', 'SKILL', 'EDUCATION']
  for (const t of critical) {
    if (!foundTypes.has(t)) {
      warnings.push(`بخش «${t}» در متن شناسایی نشد.`)
    }
  }

  return {
    detectedSections: detectedSections.map((d) => ({
      type: d.type,
      titleDetected: d.titleDetected,
      confidence: d.confidence,
      detectionMethod: d.detectionMethod,
      contentLength: d.content.length,
    })),
    extractedSkills,
    warnings,
    textLength: fullText.length,
    profile,
  }
}

/** Main engine entry point */
export function runCheckerEngine(ctx: RuleContext): EngineResult {
  // Detect sections from plain text when not already supplied
  if (!ctx.detectedSections) {
    ctx = { ...ctx, detectedSections: detectSectionsFromText(ctx.fullText) }
  }

  // Extract profile header (name, headline, email, phone) from top lines before rules run.
  // This lets ATS/HR rules avoid false positives when there's a clear header but no SUMMARY.
  if (!ctx.profile) {
    ctx = { ...ctx, profile: extractProfileHeader(ctx.fullText) }
  }

  // Run all rule modules (pass enriched ctx with detectedSections)
  const atsFindings = runAtsRules(ctx)
  const hrFindings = runHrScanRules(ctx)
  const structureFindings = runStructureRules(ctx)
  const achievementFindings = runAchievementRules(ctx)
  const { findings: keywordFindings, keywordMatch } = runKeywordRules(ctx)
  const formattingFindings = runFormattingRules(ctx)
  const completenessFindings = runCompletenessRules(ctx)
  const readabilityFindings = runReadabilityRules(ctx)

  const allFindings: CheckFinding[] = [
    ...atsFindings,
    ...hrFindings,
    ...structureFindings,
    ...achievementFindings,
    ...keywordFindings,
    ...formattingFindings,
    ...completenessFindings,
    ...readabilityFindings,
  ]

  // ── Compute dimension scores ────────────────────────────────────────────
  const atsScore            = computeDimensionScore(allFindings, 'ATS')
  const hrScanScore         = computeDimensionScore(allFindings, 'HR_SCAN')
  const structureScore      = computeDimensionScore(allFindings, 'STRUCTURE')
  const formattingRiskScore = computeDimensionScore(allFindings, 'FORMATTING')
  const completenessScore   = computeDimensionScore(allFindings, 'COMPLETENESS')
  const readabilityScore    = computeDimensionScore(allFindings, 'READABILITY')

  // Achievement score: apply hard cap when achievable content is absent.
  // Without a cap, a resume with no experience/projects scores ~72–98 on achievement
  // due to low finding penalties — which is misleading.
  const rawAchievementScore = computeDimensionScore(allFindings, 'ACHIEVEMENT')
  const hasExpContent =
    ctx.sections.some((s) => s.isVisible && s.type === 'EXPERIENCE') ||
    (ctx.detectedSections ?? []).some((d) => d.type === 'EXPERIENCE' && d.confidence >= 50)
  const hasProjContent =
    ctx.sections.some((s) => s.isVisible && s.type === 'PROJECT') ||
    (ctx.detectedSections ?? []).some((d) => d.type === 'PROJECT' && d.confidence >= 50)
  const achievementScore =
    !hasExpContent && !hasProjContent
      ? Math.min(rawAchievementScore, 45)   // no experience + no projects → cap 45
      : !hasExpContent && hasProjContent
        ? Math.min(rawAchievementScore, 65) // no experience but has projects → cap 65
        : rawAchievementScore               // experience present → no cap

  // Keyword score: use matchRate if JD provided, else baseline from findings
  let keywordScore: number
  if (keywordMatch) {
    keywordScore = keywordMatch.matchRate
  } else {
    keywordScore = computeDimensionScore(allFindings, 'KEYWORD', 70)
  }

  // roleMatchScore: derived from keywordMatch if available
  const roleMatchScore = keywordMatch ? keywordMatch.matchRate : null

  // Add ROLE_MATCH findings if keywordMatch is set
  if (keywordMatch) {
    const roleMatchFindings = allFindings.filter((f) => f.category === 'ROLE_MATCH')
    // roleMatchScore already computed above; no extra findings to add here
    void roleMatchFindings
  }

  // ── Overall score (weighted avg) ──────────────────────────────────────────
  const overallScore = Math.round(
    atsScore            * SCORE_WEIGHTS.atsScore +
    hrScanScore         * SCORE_WEIGHTS.hrScanScore +
    structureScore      * SCORE_WEIGHTS.structureScore +
    achievementScore    * SCORE_WEIGHTS.achievementScore +
    keywordScore        * SCORE_WEIGHTS.keywordScore +
    formattingRiskScore * SCORE_WEIGHTS.formattingRiskScore +
    completenessScore   * SCORE_WEIGHTS.completenessScore +
    readabilityScore    * SCORE_WEIGHTS.readabilityScore,
  )

  const scores: ScoreCard = {
    atsScore,
    hrScanScore,
    structureScore,
    achievementScore,
    keywordScore,
    formattingRiskScore,
    completenessScore,
    readabilityScore,
    roleMatchScore,
    overallScore: Math.max(0, Math.min(100, overallScore)),
  }

  const suggestions = buildSuggestions(allFindings)
  const diagnostics = buildDiagnostics(ctx.fullText, ctx.detectedSections ?? [], ctx.profile ?? { name: null, headline: null, email: null, phone: null })

  return { findings: allFindings, suggestions, scores, keywordMatch, diagnostics }
}
