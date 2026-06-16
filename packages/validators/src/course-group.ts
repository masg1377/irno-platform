import { z } from 'zod'

export const createCourseGroupSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(2).max(200),
  teacherId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  scheduleNotes: z.string().max(2000).optional().nullable(),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('UPCOMING'),
  meetinoRoomId: z.string().max(100).optional().nullable(),
})

export const updateCourseGroupSchema = createCourseGroupSchema.partial()

export const assignMentorSchema = z.object({
  mentorUserId: z.string().uuid(),
})

export type CreateCourseGroupInput = z.infer<typeof createCourseGroupSchema>
export type UpdateCourseGroupInput = z.infer<typeof updateCourseGroupSchema>
export type AssignMentorInput = z.infer<typeof assignMentorSchema>
