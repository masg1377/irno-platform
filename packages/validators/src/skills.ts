import { z } from 'zod'

// ── Skill catalog ──────────────────────────────────────────────────────────────

export const createSkillSchema = z.object({
  title: z.string().min(2).max(255),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})

export const updateSkillSchema = createSkillSchema.partial()

export type CreateSkillInput = z.infer<typeof createSkillSchema>
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>

// ── Credit catalog ─────────────────────────────────────────────────────────────

export const createCreditSchema = z.object({
  title: z.string().min(2).max(255),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(2000).optional(),
  type: z.enum([
    'COURSE_COMPLETION', 'TEST_PASSED', 'MENTOR_APPROVAL', 'EVENT_ATTENDANCE',
    'INTERVIEW_READY', 'ACCESS_PERMISSION', 'MANUAL', 'OTHER',
  ]),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  expiresAfterDays: z.number().int().positive().optional(),
})

export const updateCreditSchema = createCreditSchema.partial()

export type CreateCreditInput = z.infer<typeof createCreditSchema>
export type UpdateCreditInput = z.infer<typeof updateCreditSchema>

// ── Student skill ──────────────────────────────────────────────────────────────

export const awardStudentSkillSchema = z.object({
  skillId: z.string().uuid(),
  level: z.enum(['LEARNING', 'BASIC', 'CONFIDENT', 'ADVANCED', 'MASTERED']),
  evidenceNote: z.string().max(2000).optional(),
  sourceType: z.string().max(100).optional(),
  sourceId: z.string().uuid().optional(),
})

export type AwardStudentSkillInput = z.infer<typeof awardStudentSkillSchema>

// ── Student credit ─────────────────────────────────────────────────────────────

export const awardStudentCreditSchema = z.object({
  creditId: z.string().uuid(),
  evidenceNote: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
  sourceType: z.string().max(100).optional(),
  sourceId: z.string().uuid().optional(),
})

export const revokeCreditSchema = z.object({
  reason: z.string().max(2000).optional(),
})

export type AwardStudentCreditInput = z.infer<typeof awardStudentCreditSchema>
export type RevokeCreditInput = z.infer<typeof revokeCreditSchema>
