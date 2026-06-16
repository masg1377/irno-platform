// ── Phase 14: Career Studio Types ───────────────────────────────────────────

import type {
  CareerProfileVisibility,
  ResumeLanguage,
  ResumeVisibility,
  ResumeSectionType,
  ResumeTemplateType,
  ResumeExportFormat,
  ResumeExportStatus,
  ResumeCheckSourceType,
  RoadmapNodeType,
  RoadmapStatus,
  PortfolioProjectVisibility,
} from './enums.js'

// ── Career Profile ────────────────────────────────────────────

export interface CareerProfileDto {
  id: string
  userId: string
  studentId: string | null
  displayName: string
  headline: string | null
  summary: string | null
  location: string | null
  phone: string | null
  email: string | null
  website: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  avatarUrl: string | null
  visibility: CareerProfileVisibility
  publicSlug: string | null
  contactVisibilityConfig: ContactVisibilityConfig | null
  publicThemeConfig: Record<string, unknown> | null
  seoTitle: string | null
  seoDescription: string | null
  resumeCount: number
  createdAt: string
  updatedAt: string
}

export interface UpdateCareerProfileDto {
  displayName?: string
  headline?: string | null
  summary?: string | null
  location?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  linkedinUrl?: string | null
  githubUrl?: string | null
  portfolioUrl?: string | null
  avatarUrl?: string | null
  visibility?: CareerProfileVisibility
  publicSlug?: string | null
  contactVisibilityConfig?: ContactVisibilityConfig | null
  publicThemeConfig?: Record<string, unknown> | null
  seoTitle?: string | null
  seoDescription?: string | null
}

// ── Watermark Config ──────────────────────────────────────────

export interface WatermarkConfig {
  type: 'DIAGONAL_BACKGROUND'
  text: string
  opacity: number
}

// ── Contact Visibility Config ─────────────────────────────────

export interface ContactVisibilityConfig {
  showEmail: boolean
  showPhone: boolean
  showLocation: boolean
  showWebsite: boolean
  showLinkedin: boolean
  showGithub: boolean
  showPortfolio: boolean
}

// ── Resume Document ───────────────────────────────────────────

export interface ResumeDocumentDto {
  id: string
  userId: string
  careerProfileId: string
  title: string
  targetRole: string | null
  language: ResumeLanguage
  templateId: string | null
  templateTitle: string | null
  visibility: ResumeVisibility
  publicSlug: string | null
  styleConfig: Record<string, unknown> | null
  settings: Record<string, unknown> | null
  includeWatermark: boolean
  watermarkConfig: WatermarkConfig | null
  lastExportedAt: string | null
  allowPdfDownload: boolean
  publicThemeConfig: Record<string, unknown> | null
  sectionCount: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedResumeDocuments {
  data: ResumeDocumentDto[]
  total: number
  page: number
  pageSize: number
}

export interface CreateResumeDocumentDto {
  title: string
  targetRole?: string
  language?: ResumeLanguage
  templateId?: string
  visibility?: ResumeVisibility
}

export interface UpdateResumeDocumentDto {
  title?: string
  targetRole?: string | null
  language?: ResumeLanguage
  templateId?: string | null
  visibility?: ResumeVisibility
  publicSlug?: string | null
  styleConfig?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

// ── Resume Section ────────────────────────────────────────────

export interface ResumeSectionDto {
  id: string
  resumeDocumentId: string
  type: ResumeSectionType
  title: string
  content: Record<string, unknown>
  layoutConfig: Record<string, unknown> | null
  styleConfig: Record<string, unknown> | null
  sortOrder: number
  isVisible: boolean
  isImported: boolean
  sourceType: string | null
  sourceId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateResumeSectionDto {
  type: ResumeSectionType
  title: string
  content?: Record<string, unknown>
  layoutConfig?: Record<string, unknown>
  sortOrder?: number
  isVisible?: boolean
}

export interface UpdateResumeSectionDto {
  title?: string
  content?: Record<string, unknown>
  layoutConfig?: Record<string, unknown> | null
  styleConfig?: Record<string, unknown> | null
  sortOrder?: number
  isVisible?: boolean
}

export interface ReorderSectionsDto {
  sectionIds: string[]
}

// ── Resume Template ───────────────────────────────────────────

export interface ResumeTemplateDto {
  id: string
  title: string
  slug: string
  type: ResumeTemplateType
  language: ResumeLanguage
  description: string | null
  previewUrl: string | null
  isPremium: boolean
  isActive: boolean
  supportsAts: boolean
  supportsRtl: boolean
  supportsLtr: boolean
  sortOrder: number
}

// ── Resume Export ─────────────────────────────────────────────

export interface ResumeExportDto {
  id: string
  resumeDocumentId: string
  userId: string
  templateId: string | null
  format: ResumeExportFormat
  status: ResumeExportStatus
  fileUrl: string | null
  includeWatermark: boolean
  watermarkConfig: WatermarkConfig | null
  generatedAt: string | null
  createdAt: string
}

export interface CreateResumeExportDto {
  format?: ResumeExportFormat
  templateId?: string
  includeWatermark?: boolean
}

// ── Resume Check Report ───────────────────────────────────────

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
  priority: number          // 1 = highest
  category: FindingCategory
  title: string
  action: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface KeywordMatchResult {
  matched: string[]
  missing: string[]
  matchRate: number        // 0–100
}

export interface ResumeCheckReportDto {
  id: string
  resumeDocumentId: string | null
  userId: string
  sourceType: ResumeCheckSourceType
  sourceFileName: string | null
  targetRole: string | null
  overallScore: number
  atsScore: number
  hrScanScore: number
  structureScore: number
  keywordScore: number
  achievementScore: number
  formattingRiskScore: number
  completenessScore: number
  readabilityScore: number
  roleMatchScore: number | null
  findings: CheckFinding[]
  suggestions: CheckSuggestion[]
  keywordMatch: KeywordMatchResult | null
  createdAt: string
}

export interface ResumeCheckReportSummaryDto {
  id: string
  resumeDocumentId: string | null
  sourceType: ResumeCheckSourceType
  sourceFileName: string | null
  targetRole: string | null
  overallScore: number
  atsScore: number
  completenessScore: number
  findingCount: number
  criticalCount: number
  createdAt: string
}

export interface CheckTextRequestDto {
  resumeText: string
  targetRole?: string
  jobDescription?: string
  language?: 'FA' | 'EN' | 'FA_EN'
}

export interface PaginatedCheckReports {
  data: ResumeCheckReportSummaryDto[]
  total: number
  page: number
  pageSize: number
}

// ── Portfolio Project ─────────────────────────────────────────

export interface PortfolioProjectDto {
  id: string
  userId: string
  careerProfileId: string
  studentId: string | null
  title: string
  /** Phase 21: URL-friendly slug for direct linking */
  slug: string | null
  role: string | null
  /** Phase 21: Client or employer name */
  clientName: string | null
  description: string | null
  /** Phase 21: Short summary (max 500 chars) */
  summary: string | null
  /** Phase 21: Problem statement for case study */
  problem: string | null
  /** Phase 21: Solution description for case study */
  solution: string | null
  /** Phase 21: Outcome / impact for case study */
  impact: string | null
  /** Phase 21: Responsibilities list */
  responsibilities: string[]
  technologies: string[]
  links: { label: string; url: string }[] | null
  images: string[] | null
  /** Phase 21: Media URLs (images, videos, screenshots) */
  mediaUrls: string[]
  startDate: string | null
  endDate: string | null
  /** Phase 21: Project type (personal, work, open-source, etc.) */
  projectType: string | null
  visibility: PortfolioProjectVisibility
  sortOrder: number
  isFeatured: boolean
  coverImageUrl: string | null
  demoUrl: string | null
  repoUrl: string | null
  caseStudy: Record<string, unknown> | null
  /** Phase 21: SEO fields for project detail page */
  seoTitle: string | null
  seoDescription: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedPortfolioProjects {
  data: PortfolioProjectDto[]
  total: number
  page: number
  pageSize: number
}

export interface CreatePortfolioProjectDto {
  title: string
  slug?: string | null
  role?: string
  clientName?: string | null
  description?: string
  summary?: string | null
  problem?: string | null
  solution?: string | null
  impact?: string | null
  responsibilities?: string[]
  technologies?: string[]
  links?: { label: string; url: string }[]
  images?: string[]
  mediaUrls?: string[]
  startDate?: string
  endDate?: string
  projectType?: string | null
  visibility?: PortfolioProjectVisibility
  sortOrder?: number
  isFeatured?: boolean
  coverImageUrl?: string | null
  demoUrl?: string | null
  repoUrl?: string | null
  caseStudy?: Record<string, unknown> | null
  seoTitle?: string | null
  seoDescription?: string | null
}

export interface UpdatePortfolioProjectDto {
  title?: string
  slug?: string | null
  role?: string | null
  clientName?: string | null
  description?: string | null
  summary?: string | null
  problem?: string | null
  solution?: string | null
  impact?: string | null
  responsibilities?: string[]
  technologies?: string[]
  links?: { label: string; url: string }[] | null
  images?: string[] | null
  mediaUrls?: string[]
  startDate?: string | null
  endDate?: string | null
  projectType?: string | null
  visibility?: PortfolioProjectVisibility
  sortOrder?: number
  isFeatured?: boolean
  coverImageUrl?: string | null
  demoUrl?: string | null
  repoUrl?: string | null
  caseStudy?: Record<string, unknown> | null
  seoTitle?: string | null
  seoDescription?: string | null
}

// ── Roadmap ───────────────────────────────────────────────────

export interface RoadmapNodeDto {
  id: string
  roadmapId: string
  title: string
  description: string | null
  type: RoadmapNodeType
  sortOrder: number
  parentId: string | null
  metadata: Record<string, unknown> | null
  children?: RoadmapNodeDto[]
}

export interface RoadmapDto {
  id: string
  title: string
  slug: string
  description: string | null
  language: ResumeLanguage
  status: RoadmapStatus
  nodeCount: number
  nodes?: RoadmapNodeDto[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedRoadmaps {
  data: RoadmapDto[]
  total: number
  page: number
  pageSize: number
}

// ── Job Match ─────────────────────────────────────────────────

export interface JobMatchReportDto {
  id: string
  userId: string
  careerProfileId: string
  resumeDocumentId: string | null
  /** Phase 18.3 — source tracking */
  sourceType: 'IRNO_RESUME' | 'PASTED_TEXT' | 'UPLOADED_FILE'
  sourceFileName: string | null
  targetRole: string | null
  jobTitle: string | null
  jobDescription: string | null
  overallScore: number | null
  keywordScore: number | null
  /** Keywords found in both resume and job description */
  matchedKeywords: string[]
  /** Keywords in job description but missing from resume */
  missingKeywords: string[]
  skillGap: { skill: string; found: boolean }[] | null
  recommendations: string[]
  createdAt: string
}

export interface CreateJobMatchDto {
  resumeDocumentId?: string
  resumeText?: string
  sourceType?: 'IRNO_RESUME' | 'PASTED_TEXT' | 'UPLOADED_FILE'
  sourceFileName?: string
  jobTitle?: string
  targetRole?: string
  jobDescription: string
}

// ── Import from Irno ──────────────────────────────────────────

export interface ImportIrnoDataDto {
  importSkills?: boolean
  importCertificates?: boolean
  importCredits?: boolean
  importCourses?: boolean
  importEvents?: boolean
}

export interface ImportResultDto {
  sectionsCreated: number
  sectionsSkipped: number
  details: string[]
}

// ── Public Profile & Resume ───────────────────────────────────

export interface PublicPortfolioProjectDto {
  id: string
  title: string
  /** Phase 21: URL-friendly slug for direct linking */
  slug: string | null
  role: string | null
  /** Phase 21: Client or employer name */
  clientName: string | null
  description: string | null
  /** Phase 21: Short summary (max 500 chars) */
  summary: string | null
  /** Phase 21: Problem statement for case study */
  problem: string | null
  /** Phase 21: Solution description for case study */
  solution: string | null
  /** Phase 21: Outcome / impact for case study */
  impact: string | null
  /** Phase 21: Responsibilities list */
  responsibilities: string[]
  technologies: string[]
  demoUrl: string | null
  repoUrl: string | null
  coverImageUrl: string | null
  /** Phase 21: Media URLs (images, videos, screenshots) */
  mediaUrls: string[]
  caseStudy: Record<string, unknown> | null
  startDate: string | null
  endDate: string | null
  /** Phase 21: Project type */
  projectType: string | null
  isFeatured: boolean
  sortOrder: number
}

export interface PublicCertificateDto {
  id: string
  title: string
  issuedAt: string
  verificationCode: string
  templateType: string
}

export interface PublicProfileDto {
  slug: string
  displayName: string
  headline: string | null
  summary: string | null
  avatarUrl: string | null
  seoTitle: string | null
  seoDescription: string | null
  contact: {
    email: string | null
    phone: string | null
    location: string | null
    website: string | null
    linkedinUrl: string | null
    githubUrl: string | null
    portfolioUrl: string | null
  }
  contactVisibility: ContactVisibilityConfig
  resume: {
    id: string
    title: string
    targetRole: string | null
    language: ResumeLanguage
    templateId: string | null
    styleConfig: Record<string, unknown> | null
    allowPdfDownload: boolean
    sections: ResumeSectionDto[]
  } | null
  portfolioProjects: PublicPortfolioProjectDto[]
  certificates: PublicCertificateDto[]
}

// Keep backward compat alias
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PublicResumeDto extends PublicProfileDto {}

// ── Public Settings & Reorder ─────────────────────────────────

export interface UpdatePublicSettingsDto {
  publicSlug?: string | null
  visibility?: CareerProfileVisibility
  contactVisibilityConfig?: ContactVisibilityConfig | null
  seoTitle?: string | null
  seoDescription?: string | null
  publicThemeConfig?: Record<string, unknown> | null
}

export interface ReorderPortfolioProjectsDto {
  items: { id: string; sortOrder: number }[]
}
