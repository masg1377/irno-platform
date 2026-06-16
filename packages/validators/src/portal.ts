import { z } from 'zod'

/**
 * Schema for PATCH /api/v1/portal/profile
 *
 * Rules:
 * - Mobile change is deferred — not allowed in MVP.
 * - Role, status, studentCode changes are blocked.
 * - Email must be valid if provided.
 */
export const updatePortalProfileSchema = z.object({
  firstName: z.string().min(1, 'نام الزامی است').optional(),
  lastName: z.string().min(1, 'نام خانوادگی الزامی است').optional(),
  email: z.string().email('ایمیل معتبر نیست').nullable().optional(),
  city: z.string().nullable().optional(),
  avatarUrl: z.string().url('آدرس تصویر معتبر نیست').nullable().optional(),
})

export type UpdatePortalProfileInput = z.infer<typeof updatePortalProfileSchema>
