import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createCourseSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(slugRegex, 'slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(5000).optional(),
  category: z.string().min(1).max(100),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).default('ALL_LEVELS'),
  defaultTuitionToman: z.number().int().min(0).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
})

export const updateCourseSchema = createCourseSchema.partial()

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
