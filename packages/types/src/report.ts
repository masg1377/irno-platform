export interface NeedsFollowUpItemDto {
  id: string
  type: 'APPLICANT' | 'STUDENT'
  fullName: string
  mobile: string
  status: string
  followUpDate: string | null
  reason: string
}

export interface OverdueInstallmentItemDto {
  installmentId: string
  studentId: string
  studentName: string
  studentCode: string
  mobile: string
  courseName: string
  courseGroupName: string | null
  amountToman: number
  dueDate: string
  daysOverdue: number
  paymentId: string
}

export interface FinanceBalancesDto {
  totalPaidToman: number
  totalRemainingToman: number
  totalAmountToman: number
  unpaidCount: number
  partiallyPaidCount: number
  overdueInstallmentsCount: number
  overdueInstallmentsAmountToman: number
}

export interface EnrollmentSummaryDto {
  totalEnrollments: number
  activeEnrollments: number
  pendingEnrollments: number
  completedEnrollments: number
  cancelledEnrollments: number
  enrollmentsThisMonth: number
}

export interface CrmSummaryDto {
  totalApplicants: number
  newApplicantsThisMonth: number
  convertedApplicants: number
  conversionRate: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
}
