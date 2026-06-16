import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(2).max(300),
  slug: z.string().min(2).max(150).regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  type: z.enum(['WEBINAR', 'CONFERENCE', 'FREE_DISCUSSION', 'WORKSHOP', 'GROUP_CONSULTATION', 'OPEN_SESSION', 'CHALLENGE', 'OTHER']),
  deliveryMode: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']),
  registrationMode: z.enum(['FREE', 'PAID', 'INVITE_ONLY', 'INTERNAL_ONLY']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  onlineUrl: z.string().url().optional().or(z.literal('')),
  meetinoMeetingId: z.string().max(100).optional(),
  meetinoJoinUrl: z.string().url().optional().or(z.literal('')),
  capacity: z.number().int().positive().optional(),
  priceToman: z.number().int().min(0),
  registrationDeadline: z.string().datetime().optional(),
})

export const updateEventSchema = createEventSchema.partial()

export const updateEventStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED']),
  notifyParticipants: z.boolean().optional(),
})

export const createEventRegistrationSchema = z.object({
  userId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  applicantId: z.string().uuid().optional(),
  fullName: z.string().min(2).max(200),
  mobile: z.string().min(10).max(20),
  email: z.string().email().optional(),
  notes: z.string().optional(),
})

export const updateEventRegistrationStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW', 'WAITLISTED']),
})

export const recordEventPaymentSchema = z.object({
  amountToman: z.number().int().positive(),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
  paidAt: z.string().datetime(),
  receiptNote: z.string().max(500).optional(),
})

export const createEventEligibilityRuleSchema = z.object({
  type: z.enum([
    'ACTIVE_STUDENT_ONLY', 'SPECIFIC_COURSE', 'SPECIFIC_COURSE_GROUP',
    'COMPLETED_COURSE', 'NO_OVERDUE_PAYMENTS', 'STAFF_ONLY',
    'PUBLIC', 'MANUAL_APPROVAL_REQUIRED', 'SKILL_OR_CREDIT_PLACEHOLDER',
  ]),
  operator: z.string().max(50).optional(),
  value: z.record(z.string(), z.unknown()).optional(),
  isRequired: z.boolean().optional(),
})

export const checkEligibilitySchema = z.object({
  studentId: z.string().uuid().optional(),
  applicantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  mobile: z.string().optional(),
})

export const createEventReminderSchema = z.object({
  type: z.enum(['REGISTRATION_CONFIRMATION', 'BEFORE_24_HOURS', 'BEFORE_1_HOUR', 'EVENT_STARTED', 'EVENT_CANCELLED']),
  scheduledAt: z.string().datetime(),
  channel: z.enum(['IN_APP', 'SMS', 'EMAIL', 'TELEGRAM']),
  notificationTemplateId: z.string().uuid().optional(),
})

export const sendEventAnnouncementSchema = z.object({
  title: z.string().min(2).max(300),
  body: z.string().min(2),
  channels: z.array(z.enum(['IN_APP', 'SMS', 'EMAIL', 'TELEGRAM'])).min(1),
})

export type CreateEventDto = z.infer<typeof createEventSchema>
export type UpdateEventDto = z.infer<typeof updateEventSchema>
export type UpdateEventStatusDto = z.infer<typeof updateEventStatusSchema>
export type CreateEventRegistrationDto = z.infer<typeof createEventRegistrationSchema>
export type UpdateEventRegistrationStatusDto = z.infer<typeof updateEventRegistrationStatusSchema>
export type RecordEventPaymentDto = z.infer<typeof recordEventPaymentSchema>
export type CreateEventEligibilityRuleDto = z.infer<typeof createEventEligibilityRuleSchema>
export type CheckEligibilityDto = z.infer<typeof checkEligibilitySchema>
export type CreateEventReminderDto = z.infer<typeof createEventReminderSchema>
export type SendEventAnnouncementDto = z.infer<typeof sendEventAnnouncementSchema>
