import type {
  SkillLevel,
  SkillStatus,
  CreditType,
  CreditStatus,
  StudentSkillLevel,
  StudentCreditStatus,
} from './enums.js'

// ── Skill catalog ──────────────────────────────────────────────────────────────

export interface SkillDto {
  id: string
  title: string
  slug: string
  description: string | null
  category: string | null
  level: SkillLevel
  status: SkillStatus
  createdAt: string
  updatedAt: string
}

export interface PaginatedSkills {
  data: SkillDto[]
  total: number
  page: number
  limit: number
}

// ── Credit catalog ─────────────────────────────────────────────────────────────

export interface CreditDto {
  id: string
  title: string
  slug: string
  description: string | null
  type: CreditType
  status: CreditStatus
  expiresAfterDays: number | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedCredits {
  data: CreditDto[]
  total: number
  page: number
  limit: number
}

// ── Student skill ──────────────────────────────────────────────────────────────

export interface StudentSkillDto {
  id: string
  studentId: string
  skillId: string
  skillTitle: string
  skillCategory: string | null
  skillLevel: SkillLevel
  level: StudentSkillLevel
  sourceType: string | null
  sourceId: string | null
  awardedById: string
  awardedByName: string
  awardedAt: string
  /** Internal note — only included for staff, never sent to portal */
  evidenceNote?: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedStudentSkills {
  data: StudentSkillDto[]
  total: number
  page: number
  limit: number
}

// ── Student credit ─────────────────────────────────────────────────────────────

export interface StudentCreditDto {
  id: string
  studentId: string
  creditId: string
  creditTitle: string
  creditType: CreditType
  status: StudentCreditStatus
  sourceType: string | null
  sourceId: string | null
  awardedById: string
  awardedByName: string
  awardedAt: string
  expiresAt: string | null
  revokedAt: string | null
  revokedById: string | null
  revokedByName: string | null
  /** Internal note — only included for staff, never sent to portal */
  evidenceNote?: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedStudentCredits {
  data: StudentCreditDto[]
  total: number
  page: number
  limit: number
}

// ── Portal views (no internal notes) ──────────────────────────────────────────

export interface PortalSkillDto {
  id: string
  skillId: string
  title: string
  category: string | null
  skillLevel: SkillLevel
  level: StudentSkillLevel
  awardedAt: string
}

export interface PortalCreditDto {
  id: string
  creditId: string
  title: string
  creditType: CreditType
  status: StudentCreditStatus
  awardedAt: string
  expiresAt: string | null
}

// ── Eligibility ────────────────────────────────────────────────────────────────

export interface EligibilityCheckResult {
  eligible: boolean
  failedRules: string[]
  message: string | null
}
