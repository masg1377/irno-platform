import type { EnrollmentStatus } from './enums.js'

export interface EnrollmentDto {
  id: string
  studentId: string
  studentName: string
  studentCode: string
  courseId: string
  courseName: string
  courseGroupId: string | null
  courseGroupName: string | null
  status: EnrollmentStatus
  tuitionAmountToman: number
  discountAmountToman: number
  finalAmountToman: number
  enrollmentDate: string
  notes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  // Payment summary (included when fetching detail)
  paymentId?: string
  paymentStatus?: string
  paidAmountToman?: number
  remainingAmountToman?: number
}

export interface PaginatedEnrollments {
  data: EnrollmentDto[]
  total: number
  page: number
  limit: number
}
