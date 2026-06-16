import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  PaymentStatus,
  PaymentMethod,
  InstallmentStatus,
  TimelineEventType,
} from '@irno/types'
import type {
  CurrentUser,
  PaymentDto,
  PaginatedPayments,
  PaymentTransactionDto,
  InstallmentDto,
  FinanceSummaryDto,
} from '@irno/types'
import type { RecordTransactionDto } from './dto/record-transaction.dto'
import type { CreateInstallmentsDto } from './dto/create-installments.dto'

interface ListPaymentsOptions {
  status?: PaymentStatus
  studentId?: string
  overdue?: boolean
  page?: number
  limit?: number
}

interface ListInstallmentsOptions {
  status?: InstallmentStatus
  studentId?: string
  overdue?: boolean
  dueFrom?: string
  dueTo?: string
  page?: number
  limit?: number
}

const PAYMENT_BASE_INCLUDE = {
  enrollment: {
    select: {
      id: true,
      courseId: true,
      courseGroupId: true,
      course: { select: { id: true, title: true } },
      courseGroup: { select: { id: true, name: true } },
    },
  },
} as const

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────

  private async getStudentName(studentId: string): Promise<string> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId },
      select: {
        studentCode: true,
        user: { select: { profile: { select: { firstName: true, lastName: true } } } },
      },
    })
    if (!student) return studentId
    const p = student.user.profile
    return p ? `${p.firstName} ${p.lastName}` : student.studentCode
  }

  private computeIsOverdue(inst: { status: string; dueDate: Date }): boolean {
    return inst.status === InstallmentStatus.PENDING && inst.dueDate < new Date()
  }

  private toPaymentDto(
    p: {
      id: string; enrollmentId: string; studentId: string
      totalAmountToman: number; paidAmountToman: number; remainingAmountToman: number
      status: string; notes: string | null; createdAt: Date; updatedAt: Date
      enrollment: {
        id: string; courseId: string; courseGroupId: string | null
        course: { id: string; title: string }
        courseGroup: { id: string; name: string } | null
      }
    },
    extra?: {
      studentName: string; studentCode: string
      transactions?: PaymentTransactionDto[]
      installments?: InstallmentDto[]
    }
  ): PaymentDto {
    return {
      id: p.id,
      enrollmentId: p.enrollmentId,
      studentId: p.studentId,
      studentName: extra?.studentName ?? p.studentId,
      studentCode: extra?.studentCode ?? '',
      courseId: p.enrollment.courseId,
      courseName: p.enrollment.course.title,
      courseGroupId: p.enrollment.courseGroupId,
      courseGroupName: p.enrollment.courseGroup?.name ?? null,
      totalAmountToman: p.totalAmountToman,
      paidAmountToman: p.paidAmountToman,
      remainingAmountToman: p.remainingAmountToman,
      status: p.status as PaymentStatus,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      transactions: extra?.transactions,
      installments: extra?.installments,
    }
  }

  private toTransactionDto(
    t: {
      id: string; paymentId: string; amountToman: number; method: string
      paidAt: Date; receiptNote: string | null; recordedById: string
      createdAt: Date
      recordedBy: { profile: { firstName: string; lastName: string } | null }
    }
  ): PaymentTransactionDto {
    const p = t.recordedBy.profile
    return {
      id: t.id,
      paymentId: t.paymentId,
      amountToman: t.amountToman,
      method: t.method as PaymentMethod,
      paidAt: t.paidAt.toISOString(),
      receiptNote: t.receiptNote,
      recordedById: t.recordedById,
      recordedByName: p ? `${p.firstName} ${p.lastName}` : t.recordedById,
      createdAt: t.createdAt.toISOString(),
    }
  }

  private toInstallmentDto(
    inst: {
      id: string; paymentId: string; studentId: string; installmentNumber: number
      amountToman: number; dueDate: Date; paidAt: Date | null
      status: string; notes: string | null; createdAt: Date; updatedAt: Date
    }
  ): InstallmentDto {
    return {
      id: inst.id,
      paymentId: inst.paymentId,
      studentId: inst.studentId,
      installmentNumber: inst.installmentNumber,
      amountToman: inst.amountToman,
      dueDate: inst.dueDate.toISOString(),
      paidAt: inst.paidAt?.toISOString() ?? null,
      status: inst.status as InstallmentStatus,
      isOverdue: this.computeIsOverdue(inst),
      notes: inst.notes,
      createdAt: inst.createdAt.toISOString(),
      updatedAt: inst.updatedAt.toISOString(),
    }
  }

  // ─── List payments ─────────────────────────────────────────

  async findAll(options: ListPaymentsOptions = {}): Promise<PaginatedPayments> {
    const { status, studentId, overdue, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit
    const now = new Date()

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (studentId) where.studentId = studentId
    if (overdue) {
      where.status = { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] }
      where.installments = { some: { status: InstallmentStatus.PENDING, dueDate: { lt: now } } }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...PAYMENT_BASE_INCLUDE,
          enrollment: {
            select: {
              id: true,
              courseId: true,
              courseGroupId: true,
              course: { select: { id: true, title: true } },
              courseGroup: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ])

    const data = await Promise.all(
      // @ts-ignore
      payments.map(async (p) => {
        const student = await this.prisma.student.findFirst({
          where: { id: p.studentId },
          select: { studentCode: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } } },
        })
        const profile = student?.user.profile
        return this.toPaymentDto(p, {
          studentName: profile ? `${profile.firstName} ${profile.lastName}` : p.studentId,
          studentCode: student?.studentCode ?? '',
        })
      })
    )

    return { data, total, page, limit }
  }

  // ─── Get payment detail ────────────────────────────────────

  async findOne(id: string): Promise<PaymentDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: {
        enrollment: {
          select: {
            id: true,
            courseId: true,
            courseGroupId: true,
            course: { select: { id: true, title: true } },
            courseGroup: { select: { id: true, name: true } },
          },
        },
        transactions: {
          orderBy: { paidAt: 'desc' },
          include: {
            recordedBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
          },
        },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    })
    if (!payment) throw new NotFoundException('پرداخت یافت نشد')

    const student = await this.prisma.student.findFirst({
      where: { id: payment.studentId },
      select: { studentCode: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } } },
    })
    const profile = student?.user.profile

    return this.toPaymentDto(payment, {
      studentName: profile ? `${profile.firstName} ${profile.lastName}` : payment.studentId,
      studentCode: student?.studentCode ?? '',
      // @ts-ignore
      transactions: payment.transactions.map((t) => this.toTransactionDto(t)),
      // @ts-ignore
      installments: payment.installments.map((i) => this.toInstallmentDto(i)),
    })
  }

  // ─── Record transaction ────────────────────────────────────

  async recordTransaction(
    paymentId: string,
    dto: RecordTransactionDto,
    actor: CurrentUser,
  ): Promise<PaymentTransactionDto> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('پرداخت یافت نشد')

    if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.FREE) {
      throw new BadRequestException('این پرداخت قبلاً کامل شده است')
    }

    if (dto.amountToman > payment.remainingAmountToman) {
      throw new BadRequestException(
        `مبلغ پرداخت (${dto.amountToman} تومان) بیش از مانده (${payment.remainingAmountToman} تومان) است`
      )
    }

    const newPaid = payment.paidAmountToman + dto.amountToman
    const newRemaining = payment.totalAmountToman - newPaid
    const newStatus: PaymentStatus =
      newRemaining === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID

    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentTransaction.create({
        data: {
          paymentId,
          amountToman: dto.amountToman,
          method: dto.method ?? PaymentMethod.CASH,
          paidAt: new Date(dto.paidAt),
          receiptNote: dto.receiptNote ?? null,
          recordedById: actor.id,
        },
        include: {
          recordedBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
        },
      })

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          paidAmountToman: newPaid,
          remainingAmountToman: newRemaining,
          status: newStatus,
        },
      })

      // Timeline event
      await tx.studentTimelineEvent.create({
        data: {
          studentId: payment.studentId,
          eventType: newStatus === PaymentStatus.PAID
            ? TimelineEventType.PAYMENT_COMPLETED
            : TimelineEventType.PAYMENT_RECORDED,
          actorId: actor.id,
          title: newStatus === PaymentStatus.PAID
            ? `پرداخت کامل شد — ${dto.amountToman.toLocaleString()} تومان`
            : `پرداخت ثبت شد — ${dto.amountToman.toLocaleString()} تومان`,
          metadata: { paymentId, amountToman: dto.amountToman, method: dto.method },
        },
      })

      return created
    })

    return this.toTransactionDto(transaction)
  }

  // ─── Get transactions ──────────────────────────────────────

  async getTransactions(paymentId: string): Promise<PaymentTransactionDto[]> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('پرداخت یافت نشد')

    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { paymentId },
      orderBy: { paidAt: 'desc' },
      include: {
        recordedBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
      },
    })
    // @ts-ignore
    return transactions.map((t) => this.toTransactionDto(t))
  }

  // ─── Create installments ───────────────────────────────────

  async createInstallments(
    paymentId: string,
    dto: CreateInstallmentsDto,
    actor: CurrentUser,
  ): Promise<InstallmentDto[]> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId },
      include: { _count: { select: { installments: true } } },
    })
    if (!payment) throw new NotFoundException('پرداخت یافت نشد')

    if ((payment._count?.installments ?? 0) > 0) {
      throw new ConflictException('برنامه اقساط برای این پرداخت قبلاً ثبت شده است')
    }

    // Validate no duplicate installment numbers
    const nums = dto.installments.map((i) => i.installmentNumber)
    if (new Set(nums).size !== nums.length) {
      throw new BadRequestException('شماره اقساط نباید تکراری باشد')
    }

    // Create all installments
    const created = await this.prisma.$transaction(async (tx) => {
      const installments = await Promise.all(
        dto.installments.map((item) =>
          tx.installment.create({
            data: {
              paymentId,
              studentId: payment.studentId,
              installmentNumber: item.installmentNumber,
              amountToman: item.amountToman,
              dueDate: new Date(item.dueDate),
              notes: item.notes ?? null,
              status: InstallmentStatus.PENDING,
            },
          })
        )
      )

      await tx.studentTimelineEvent.create({
        data: {
          studentId: payment.studentId,
          eventType: TimelineEventType.INSTALLMENT_CREATED,
          actorId: actor.id,
          title: `برنامه اقساط (${dto.installments.length} قسط) ثبت شد`,
          metadata: { paymentId, count: dto.installments.length },
        },
      })

      return installments
    })

    return created.map((i) => this.toInstallmentDto(i))
  }

  // ─── Get installments ──────────────────────────────────────

  async getInstallments(paymentId: string): Promise<InstallmentDto[]> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('پرداخت یافت نشد')

    const installments = await this.prisma.installment.findMany({
      where: { paymentId },
      orderBy: { installmentNumber: 'asc' },
    })
    // @ts-ignore
    return installments.map((i) => this.toInstallmentDto(i))
  }

  // ─── List all installments ─────────────────────────────────

  async listInstallments(options: ListInstallmentsOptions): Promise<{
    data: InstallmentDto[]
    total: number
    page: number
    limit: number
  }> {
    const { status, studentId, overdue, dueFrom, dueTo, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit
    const now = new Date()

    const where: Record<string, unknown> = {}
    if (studentId) where.studentId = studentId
    if (status) where.status = status
    if (overdue) {
      where.status = InstallmentStatus.PENDING
      where.dueDate = { lt: now }
    } else {
      if (dueFrom || dueTo) {
        where.dueDate = {
          ...(dueFrom ? { gte: new Date(dueFrom) } : {}),
          ...(dueTo ? { lte: new Date(dueTo) } : {}),
        }
      }
    }

    const [installments, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.installment.count({ where }),
    ])

    return {
      // @ts-ignore
      data: installments.map((i) => this.toInstallmentDto(i)),
      total,
      page,
      limit,
    }
  }

  // ─── Update installment status ─────────────────────────────

  async updateInstallmentStatus(
    installmentId: string,
    newStatus: InstallmentStatus,
    actor: CurrentUser,
  ): Promise<InstallmentDto> {
    const installment = await this.prisma.installment.findFirst({ where: { id: installmentId } })
    if (!installment) throw new NotFoundException('قسط یافت نشد')

    if (newStatus === InstallmentStatus.PAID) {
      throw new BadRequestException(
        'برای ثبت پرداخت قسط، از ثبت تراکنش پرداخت استفاده کنید. علامت‌گذاری مستقیم مجاز نیست.'
      )
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.installment.update({
        where: { id: installmentId },
        data: { status: newStatus },
      })

      if (newStatus === InstallmentStatus.WAIVED) {
        await tx.studentTimelineEvent.create({
          data: {
            studentId: installment.studentId,
            eventType: TimelineEventType.INSTALLMENT_WAIVED,
            actorId: actor.id,
            title: `قسط شماره ${installment.installmentNumber} بخشوده شد`,
            metadata: { installmentId, paymentId: installment.paymentId, amountToman: installment.amountToman },
            isManual: false,
          },
        })
      }

      return result
    })

    return this.toInstallmentDto(updated)
  }

  // ─── Finance summary ───────────────────────────────────────

  async getFinanceSummary(): Promise<FinanceSummaryDto> {
    const now = new Date()

    const [
      totalEnrollments,
      activeEnrollments,
      paymentAgg,
      overdueInstallments,
      partiallyPaidCount,
      unpaidCount,
    ] = await Promise.all([
      this.prisma.enrollment.count({ where: { deletedAt: null } }),
      this.prisma.enrollment.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.payment.aggregate({
        _sum: { totalAmountToman: true, paidAmountToman: true, remainingAmountToman: true },
      }),
      this.prisma.installment.findMany({
        where: { status: InstallmentStatus.PENDING, dueDate: { lt: now } },
        select: { amountToman: true },
      }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PARTIALLY_PAID } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.UNPAID } }),
    ])

    return {
      totalEnrollments,
      activeEnrollments,
      totalRecordedRevenueToman: paymentAgg._sum.totalAmountToman ?? 0,
      totalPaidToman: paymentAgg._sum.paidAmountToman ?? 0,
      totalRemainingToman: paymentAgg._sum.remainingAmountToman ?? 0,
      overdueInstallmentsCount: overdueInstallments.length,
      // @ts-ignore
      overdueInstallmentsAmountToman: overdueInstallments.reduce((s, i) => s + i.amountToman, 0),
      partiallyPaidCount,
      unpaidCount,
    }
  }
}
