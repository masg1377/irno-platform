import { z } from 'zod'

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  courseGroupId: z.string().uuid().nullable().optional(),
  tuitionAmountToman: z.number().int().min(0),
  discountAmountToman: z.number().int().min(0).default(0),
  enrollmentDate: z.string().datetime({ offset: true }).or(z.string().date()),
  notes: z.string().max(2000).nullable().optional(),
})

export const updateEnrollmentSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  // Money edits only allowed if no transactions exist — enforced on backend
  tuitionAmountToman: z.number().int().min(0).optional(),
  discountAmountToman: z.number().int().min(0).optional(),
})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>
