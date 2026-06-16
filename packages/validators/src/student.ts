import { z } from 'zod'
import { StudentStatus } from '@irno/types'
import { mobileSchema } from './user.js'

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'نام الزامی است').max(100).trim(),
  lastName: z.string().min(1, 'نام خانوادگی الزامی است').max(100).trim(),
  mobile: mobileSchema,
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')).transform(v => v || undefined),
  city: z.string().max(100).trim().optional(),
  status: z.nativeEnum(StudentStatus).default(StudentStatus.ACTIVE),
  internalNotes: z.string().max(5000).trim().optional(),
})

export const updateStudentSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')).transform(v => v || undefined),
  city: z.string().max(100).trim().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  internalNotes: z.string().max(5000).trim().optional(),
  avatarUrl: z.string().url().optional(),
  telegramHandle: z.string().max(100).optional(),
})

export const addStudentNoteSchema = z.object({
  content: z.string().min(1, 'متن یادداشت الزامی است').max(5000).trim(),
})

export const listStudentsSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
export type AddStudentNoteInput = z.infer<typeof addStudentNoteSchema>
export type ListStudentsInput = z.infer<typeof listStudentsSchema>
