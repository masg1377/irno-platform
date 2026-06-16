import { z } from 'zod'

export const recordTransactionSchema = z.object({
  amountToman: z.number().int().min(1),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).default('CASH'),
  paidAt: z.string().datetime({ offset: true }).or(z.string().date()),
  receiptNote: z.string().max(500).nullable().optional(),
})

const installmentItemSchema = z.object({
  installmentNumber: z.number().int().min(1),
  amountToman: z.number().int().min(1),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  notes: z.string().max(500).nullable().optional(),
})

export const createInstallmentsSchema = z.object({
  installments: z.array(installmentItemSchema).min(1).max(60),
})

export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>
export type CreateInstallmentsInput = z.infer<typeof createInstallmentsSchema>
