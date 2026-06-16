import { z } from 'zod'

export const attachMeetinoMeetingSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  manualJoinUrl: z.string().url().max(500).optional(),
  createInMeetino: z.boolean(),
})

export const updateMeetinoReferenceSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  joinUrl: z.string().url().max(500).optional(),
  status: z
    .enum(['DRAFT', 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'UNKNOWN'])
    .optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
})

export type AttachMeetinoMeetingInput = z.infer<typeof attachMeetinoMeetingSchema>
export type UpdateMeetinoReferenceInput = z.infer<typeof updateMeetinoReferenceSchema>
