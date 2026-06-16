/**
 * Resume Checker — shared types for the rule engine.
 * All rule files import from here.
 */

export type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'PASS'

export type FindingCategory =
  | 'ATS'
  | 'HR_SCAN'
  | 'STRUCTURE'
  | 'ACHIEVEMENT'
  | 'KEYWORD'
  | 'FORMATTING'
  | 'COMPLETENESS'
  | 'READABILITY'
  | 'ROLE_MATCH'

export interface CheckFinding {
  id: string
  category: FindingCategory
  severity: FindingSeverity
  title: string
  message: string
  section?: string
  recommendation?: string
  affectedText?: string
  ruleCode: string
}

export interface CheckSuggestion {
  priority: number
  category: FindingCategory
  title: string
  action: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface ScoreCard {
  atsScore: number
  hrScanScore: number
  structureScore: number
  achievementScore: number
  keywordScore: number
  formattingRiskScore: number
  completenessScore: number
  readabilityScore: number
  roleMatchScore: number | null
  overallScore: number
}

export interface KeywordMatchResult {
  matched: string[]
  missing: string[]
  matchRate: number
}

/**
 * How a section was detected in plain text.
 * EXACT_HEADING   — heading text exactly matched a known section name
 * ALIAS           — heading matched a known alias (case-insensitive)
 * CONTENT_PATTERN — content pattern matched even without a clear heading
 * POSITIONAL      — position-based heuristic (e.g. top-of-doc paragraph)
 */
export type DetectionMethod = 'EXACT_HEADING' | 'ALIAS' | 'CONTENT_PATTERN' | 'POSITIONAL'

/**
 * A section detected from plain resume text.
 * Created by detectSectionsFromText() in the engine.
 * Used by all rules when ctx.sections is empty (external/uploaded resume).
 */
export interface DetectedSection {
  /** Canonical section type: SUMMARY | EXPERIENCE | EDUCATION | SKILL | PROJECT | CERTIFICATE | LANGUAGE */
  type: string
  /** The actual heading string found in the text (e.g. "ABOUT ME", "مهارت‌ها") */
  titleDetected: string
  /** 0–100 confidence score. Rules should ignore sections with confidence < 40. */
  confidence: number
  /** How this section was identified */
  detectionMethod: DetectionMethod
  /** Extracted text content of the section */
  content: string
  /** Line index where section starts in the source text */
  startLine: number
  /** Line index where section ends */
  endLine: number
}

/**
 * Profile header extracted from the top portion of a resume (before any section headings).
 * Contains: name, job title/headline, email, phone.
 * Used by ATS and HR rules to avoid false positives when the resume has a clear
 * professional header even if the SUMMARY section is empty or short.
 */
export interface ResumeProfileHeader {
  name: string | null
  headline: string | null
  email: string | null
  phone: string | null
}

export interface RuleContext {
  /** Structured sections from Irno resume document (may be empty for external text) */
  sections: ResumeSection[]
  /** Plain text of the resume (always available — derived from sections or pasted) */
  fullText: string
  /**
   * Sections detected from plain text by the engine's heading/alias/pattern scanner.
   * Populated before rules run. Empty only for Irno structured resumes that have no text.
   * Rules MUST check both sections[] and detectedSections[] — never assume one is enough.
   */
  detectedSections?: DetectedSection[]
  /**
   * Profile header extracted from the top lines of the resume before the first section.
   * Populated before rules run. Rules that check for headline/role should consult this
   * before firing a CRITICAL/WARNING when the SUMMARY section is empty.
   */
  profile?: ResumeProfileHeader
  /** Job target role string provided by user */
  targetRole?: string
  /** Job description text for keyword matching */
  jobDescription?: string
  /** Template metadata from Irno resume */
  templateType?: string
  /** Style config from Irno resume */
  styleConfig?: Record<string, unknown>
  /** Language hint */
  language?: 'FA' | 'EN' | 'FA_EN'
}

export interface ResumeSection {
  type: string
  title: string
  sortOrder: number
  isVisible: boolean
  content: Record<string, unknown>
}

export interface RuleResult {
  findings: CheckFinding[]
  /** Partial scores (each rule can contribute; engine merges all) */
  scoreAdjustments: Partial<Record<keyof ScoreCard, number>>
}

/**
 * Parser diagnostics returned with every EngineResult.
 * Useful for the checker UI to show which sections were detected and how.
 */
export interface ParserDiagnostics {
  /** All sections the parser detected from plain text */
  detectedSections: Array<{
    type: string
    titleDetected: string
    confidence: number
    detectionMethod: DetectionMethod
    contentLength: number
  }>
  /** Skills extracted from grouped labels (Frameworks:, Languages:, etc.) and tech term scan */
  extractedSkills: string[]
  /** Any parser warnings (e.g. low-confidence detection, missing sections) */
  warnings: string[]
  /** Total char count of the text analysed */
  textLength: number
  /** Profile header extracted from the top of the resume */
  profile?: ResumeProfileHeader
}
