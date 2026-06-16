import { z } from 'zod'

const slugRegex = /^[a-z0-9-]+$/

export const createTaxonomyTermSchema = z.object({
  type: z.enum([
    'COURSE_CATEGORY', 'SKILL_CATEGORY', 'CREDIT_CATEGORY',
    'EVENT_CATEGORY', 'RESUME_CATEGORY', 'GENERAL',
  ]),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(slugRegex),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  sortOrder: z.number().int().min(0).optional(),
  color: z.string().max(50).optional(),
  icon: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateTaxonomyTermSchema = createTaxonomyTermSchema.partial().omit({ type: true })

export type CreateTaxonomyTermInput = z.infer<typeof createTaxonomyTermSchema>
export type UpdateTaxonomyTermInput = z.infer<typeof updateTaxonomyTermSchema>
