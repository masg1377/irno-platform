import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EventsService } from '../events/events.service'
import type {
  NeedsFollowUpItemDto,
  OverdueInstallmentItemDto,
  FinanceBalancesDto,
  EnrollmentSummaryDto,
  CrmSummaryDto,
  EventsSummaryDto,
} from '@irno/types'

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  // ─── Needs Follow-Up ─────────────────────────────────────────────────────────

  async getNeedsFollowUp(): Promise<NeedsFollowUpItemDto[]> {
    const now = new Date()

    const applicants = await this.prisma.applicant.findMany({
      where: {
        deletedAt: null,
        followUpDate: { lte: now },
        status: { notIn: ['REGISTERED', 'CANCELLED', 'NOT_INTERESTED'] },
      },
      orderBy: { followUpDate: 'asc' },
      take: 200,
    })

    return applicants.map((a) => ({
      id: a.id,
      type: 'APPLICANT' as const,
      fullName: a.fullName,
      mobile: a.mobile,
      status: a.status,
      followUpDate: a.followUpDate?.toISOString() ?? null,
      reason: 'تاریخ پیگیری گذشته است',
    }))
  }

  // ─── Overdue Installments ─────────────────────────────────────────────────────

  async getOverdueInstallments(): Promise<OverdueInstallmentItemDto[]> {
    const now = new Date()

    const installments = await this.prisma.installment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
      },
      orderBy: { dueDate: 'asc' },
      take: 500,
      include: {
        payment: {
          include: {
            enrollment: {
              include: {
                course: { select: { id: true, title: true } },
                courseGroup: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    // Fetch student info separately
    const studentIds = [...new Set(installments.map((i) => i.studentId))]
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        user: {
          select: {
            mobile: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })
    const studentMap = new Map(students.map((s) => [s.id, s]))

    return installments.map((inst) => {
      const student = studentMap.get(inst.studentId)
      const daysOverdue = Math.floor((now.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const enrollment = inst.payment.enrollment

      return {
        installmentId: inst.id,
        studentId: inst.studentId,
        studentName: student
          ? student.user.profile
            ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
            : student.user.mobile
          : '—',
        studentCode: student?.studentCode ?? '—',
        mobile: student?.user.mobile ?? '—',
        courseName: enrollment.course.title,
        courseGroupName: enrollment.courseGroup?.name ?? null,
        amountToman: inst.amountToman,
        dueDate: inst.dueDate.toISOString(),
        daysOverdue,
        paymentId: inst.paymentId,
      }
    })
  }

  // ─── Finance Balances ─────────────────────────────────────────────────────────

  async getFinanceBalances(): Promise<FinanceBalancesDto> {
    const now = new Date()

    const [payments, overdueInstallments] = await Promise.all([
      this.prisma.payment.findMany({
        select: {
          totalAmountToman: true,
          paidAmountToman: true,
          remainingAmountToman: true,
          status: true,
        },
      }),
      this.prisma.installment.findMany({
        where: { status: 'PENDING', dueDate: { lt: now } },
        select: { amountToman: true },
      }),
    ])

    const totalPaidToman = payments.reduce((sum, p) => sum + p.paidAmountToman, 0)
    const totalRemainingToman = payments.reduce((sum, p) => sum + p.remainingAmountToman, 0)
    const totalAmountToman = payments.reduce((sum, p) => sum + p.totalAmountToman, 0)
    const unpaidCount = payments.filter((p) => p.status === 'UNPAID').length
    const partiallyPaidCount = payments.filter((p) => p.status === 'PARTIALLY_PAID').length
    const overdueInstallmentsCount = overdueInstallments.length
    const overdueInstallmentsAmountToman = overdueInstallments.reduce((sum, i) => sum + i.amountToman, 0)

    return {
      totalPaidToman,
      totalRemainingToman,
      totalAmountToman,
      unpaidCount,
      partiallyPaidCount,
      overdueInstallmentsCount,
      overdueInstallmentsAmountToman,
    }
  }

  // ─── Enrollment Summary ──────────────────────────────────────────────────────

  async getEnrollmentSummary(): Promise<EnrollmentSummaryDto> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, active, pending, completed, cancelled, thisMonth] = await Promise.all([
      this.prisma.enrollment.count({ where: { deletedAt: null } }),
      this.prisma.enrollment.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.enrollment.count({ where: { deletedAt: null, status: 'PENDING' } }),
      this.prisma.enrollment.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
      this.prisma.enrollment.count({ where: { deletedAt: null, status: 'CANCELLED' } }),
      this.prisma.enrollment.count({
        where: { deletedAt: null, enrollmentDate: { gte: startOfMonth } },
      }),
    ])

    return {
      totalEnrollments: total,
      activeEnrollments: active,
      pendingEnrollments: pending,
      completedEnrollments: completed,
      cancelledEnrollments: cancelled,
      enrollmentsThisMonth: thisMonth,
    }
  }

  // ─── CRM Summary ──────────────────────────────────────────────────────────────

  async getCrmSummary(): Promise<CrmSummaryDto> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, newThisMonth, converted, byStatus, bySource] = await Promise.all([
      this.prisma.applicant.count({ where: { deletedAt: null } }),
      this.prisma.applicant.count({
        where: { deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.applicant.count({
        where: { deletedAt: null, convertedToStudentId: { not: null } },
      }),
      this.prisma.applicant.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.applicant.groupBy({
        by: ['source'],
        where: { deletedAt: null },
        _count: { source: true },
      }),
    ])

    const byStatusMap: Record<string, number> = {}
    for (const item of byStatus) {
      byStatusMap[item.status] = item._count.status
    }

    const bySourceMap: Record<string, number> = {}
    for (const item of bySource) {
      bySourceMap[item.source] = item._count.source
    }

    return {
      totalApplicants: total,
      newApplicantsThisMonth: newThisMonth,
      convertedApplicants: converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      byStatus: byStatusMap,
      bySource: bySourceMap,
    }
  }

  // ─── Events Summary ───────────────────────────────────────────────────────────

  async getEventsSummary(): Promise<EventsSummaryDto> {
    return this.eventsService.getEventsSummary()
  }
}
