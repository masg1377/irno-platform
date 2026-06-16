import { z } from 'zod'

const slugRegex = /^[a-z0-9-]+$/

export const createCertificateTemplateSchema = z.object({
  title: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(slugRegex),
  description: z.string().max(2000).optional(),
  type: z.enum(['COURSE_COMPLETION', 'EVENT_ATTENDANCE', 'SKILL_CREDIT', 'MANUAL', 'WORKSHOP', 'OTHER'] as const),
  language: z.enum(['FA', 'EN', 'FA_EN'] as const).optional(),
  layoutConfig: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

export const updateCertificateTemplateSchema = createCertificateTemplateSchema.partial()

export const issueCertificateSchema = z.object({
  templateId: z.string().uuid().optional(),
  title: z.string().min(2).max(500),
  type: z.enum(['COURSE_COMPLETION', 'EVENT_ATTENDANCE', 'SKILL_CREDIT', 'MANUAL', 'WORKSHOP', 'OTHER'] as const),
  sourceType: z.enum(['COURSE', 'COURSE_GROUP', 'ENROLLMENT', 'CREDIT', 'EVENT', 'MANUAL'] as const).optional(),
  sourceId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
  publicVerifyEnabled: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const revokeCertificateSchema = z.object({
  revokeReason: z.string().max(1000).optional(),
})
