import type { PaymentStatus, PaymentMethod, InstallmentStatus } from './enums.js'

export interface PaymentTransactionDto {
  id: string
  paymentId: string
  amountToman: number
  method: PaymentMethod
  paidAt: string
  receiptNote: string | null
  recordedById: string
  recordedByName: string
  createdAt: string
}

export interface InstallmentDto {
  id: string
  paymentId: string
  studentId: string
  installmentNumber: number
  amountToman: number
  dueDate: string
  paidAt: string | null
  status: InstallmentStatus
  isOverdue: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentDto {
  id: string
  enrollmentId: string
  studentId: string
  studentName: string
  studentCode: string
  courseId: string
  courseName: string
  courseGroupId: string | null
  courseGroupName: string | null
  totalAmountToman: number
  paidAmountToman: number
  remainingAmountToman: number
  status: PaymentStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  transactions?: PaymentTransactionDto[]
  installments?: InstallmentDto[]
}

export interface PaginatedPayments {
  data: PaymentDto[]
  total: number
  page: number
  limit: number
}

export interface FinanceSummaryDto {
  totalEnrollments: number
  activeEnrollments: number
  totalRecordedRevenueToman: number
  totalPaidToman: number
  totalRemainingToman: number
  overdueInstallmentsCount: number
  overdueInstallmentsAmountToman: number
  partiallyPaidCount: number
  unpaidCount: number
}
