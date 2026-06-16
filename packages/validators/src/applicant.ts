import { z } from 'zod'
import { ApplicantStatus, ApplicantSource } from '@irno/types'
import { mobileSchema } from './user.js'

export const createApplicantSchema = z.object({
  fullName: z.string().min(2, 'نام الزامی است').max(200).trim(),
  mobile: mobileSchema,
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')).transform(v => v || undefined),
  city: z.string().max(100).trim().optional(),
  source: z.nativeEnum(ApplicantSource).default(ApplicantSource.OTHER),
  interestedTopic: z.string().max(300).trim().optional(),
  status: z.nativeEnum(ApplicantStatus).default(ApplicantStatus.NEW_APPLICANT),
  consultationNotes: z.string().max(5000).trim().optional(),
  followUpDate: z.string().datetime({ offset: true }).optional().or(z.literal('')).transform(v => v || undefined),
  assignedToUserId: z.string().uuid().optional(),
})

export const updateApplicantSchema = z.object({
  fullName: z.string().min(2).max(200).trim().optional(),
  mobile: mobileSchema.optional(),
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')).transform(v => v || undefined),
  city: z.string().max(100).trim().optional(),
  source: z.nativeEnum(ApplicantSource).optional(),
  interestedTopic: z.string().max(300).trim().optional(),
  status: z.nativeEnum(ApplicantStatus).optional(),
  consultationNotes: z.string().max(5000).trim().optional(),
  followUpDate: z.string().datetime({ offset: true }).optional().or(z.literal('')).transform(v => v || undefined),
  assignedToUserId: z.string().uuid().optional().nullable(),
})

export const addApplicantNoteSchema = z.object({
  content: z.string().min(1, 'متن یادداشت الزامی است').max(5000).trim(),
})

export const assignApplicantSchema = z.object({
  assignedToUserId: z.string().uuid().nullable(),
})

export const convertApplicantSchema = z.object({
  firstName: z.string().min(1, 'نام الزامی است').max(100).trim(),
  lastName: z.string().min(1, 'نام خانوادگی الزامی است').max(100).trim(),
  city: z.string().max(100).trim().optional(),
  internalNotes: z.string().max(5000).trim().optional(),
})

export const listApplicantsSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ApplicantStatus).optional(),
  source: z.nativeEnum(ApplicantSource).optional(),
  assignedToUserId: z.string().uuid().optional(),
  followUpFrom: z.string().datetime({ offset: true }).optional(),
  followUpTo: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateApplicantInput = z.infer<typeof createApplicantSchema>
export type UpdateApplicantInput = z.infer<typeof updateApplicantSchema>
export type AddApplicantNoteInput = z.infer<typeof addApplicantNoteSchema>
export type AssignApplicantInput = z.infer<typeof assignApplicantSchema>
export type ConvertApplicantInput = z.infer<typeof convertApplicantSchema>
export type ListApplicantsInput = z.infer<typeof listApplicantsSchema>
