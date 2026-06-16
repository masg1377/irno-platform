import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EnrollmentStatus, PaymentStatus, TimelineEventType } from '@irno/types'
import type { CurrentUser, EnrollmentDto, PaginatedEnrollments } from '@irno/types'
import type { CreateEnrollmentDto } from './dto/create-enrollment.dto'
import type { UpdateEnrollmentDto } from './dto/update-enrollment.dto'

interface ListEnrollmentsOptions {
  studentId?: string
  courseId?: string
  courseGroupId?: string
  status?: EnrollmentStatus
  page?: number
  limit?: number
}

const ENROLLMENT_INCLUDE = {
  student: {
    select: {
      id: true,
      studentCode: true,
      user: { select: { profile: { select: { firstName: true, lastName: true } } } },
    },
  },
  course: { select: { id: true, title: true } },
  courseGroup: { select: { id: true, name: true } },
  payment: { select: { id: true, status: true, paidAmountToman: true, remainingAmountToman: true } },
} as const

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ──────────────────────────────────────────────────

  async findAll(options: ListEnrollmentsOptions = {}): Promise<PaginatedEnrollments> {
    const { studentId, courseId, courseGroupId, status, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where = {
      deletedAt: null,
      ...(studentId ? { studentId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(courseGroupId ? { courseGroupId } : {}),
      ...(status ? { status } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrollmentDate: 'desc' },
        include: ENROLLMENT_INCLUDE,
      }),
      this.prisma.enrollment.count({ where }),
    ])

    return {
      // @ts-ignore
      data: data.map((e) => this.toEnrollmentDto(e)),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ──────────────────────────────────────────────

  async findOne(id: string): Promise<EnrollmentDto> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null },
      include: ENROLLMENT_INCLUDE,
    })
    if (!enrollment) throw new NotFoundException('ثبت‌نام یافت نشد')
    return this.toEnrollmentDto(enrollment)
  }

  // ─── Create ────────────────────────────────────────────────

  async create(dto: CreateEnrollmentDto, actor: CurrentUser): Promise<EnrollmentDto> {
    // Validate student exists
    const student = await this.prisma.student.findFirst({ where: { id: dto.studentId, deletedAt: null } })
    if (!student) throw new NotFoundException('دانشجو یافت نشد')

    // Validate course exists
    const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, deletedAt: null } })
    if (!course) throw new NotFoundException('دوره یافت نشد')

    // Validate courseGroup belongs to course
    if (dto.courseGroupId) {
      const group = await this.prisma.courseGroup.findFirst({
        where: { id: dto.courseGroupId, courseId: dto.courseId, deletedAt: null },
      })
      if (!group) throw new BadRequestException('گروه انتخابی به این دوره تعلق ندارد')
    }

    // Prevent duplicate active enrollment for same student+group
    if (dto.courseGroupId) {
      const existing = await this.prisma.enrollment.findFirst({
        where: {
          studentId: dto.studentId,
          courseGroupId: dto.courseGroupId,
          status: { in: [EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE] },
          deletedAt: null,
        },
      })
      if (existing) throw new ConflictException('این دانشجو قبلاً در این گروه ثبت‌نام فعال دارد')
    }

    const discount = dto.discountAmountToman ?? 0
    const finalAmount = dto.tuitionAmountToman - discount
    if (finalAmount < 0) throw new BadRequestException('مبلغ نهایی نمی‌تواند منفی باشد')

    // Determine initial payment status
    const paymentStatus: PaymentStatus =
      finalAmount === 0 ? PaymentStatus.FREE : PaymentStatus.UNPAID

    // Create enrollment + payment in one transaction
    const enrollment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.enrollment.create({
        data: {
          studentId: dto.studentId,
          courseId: dto.courseId,
          courseGroupId: dto.courseGroupId ?? null,
          status: EnrollmentStatus.ACTIVE,
          tuitionAmountToman: dto.tuitionAmountToman,
          discountAmountToman: discount,
          finalAmountToman: finalAmount,
          enrollmentDate: new Date(dto.enrollmentDate),
          notes: dto.notes ?? null,
          createdById: actor.id,
        },
        include: ENROLLMENT_INCLUDE,
      })

      await tx.payment.create({
        data: {
          enrollmentId: created.id,
          studentId: dto.studentId,
          totalAmountToman: finalAmount,
          paidAmountToman: 0,
          remainingAmountToman: finalAmount,
          status: paymentStatus,
        },
      })

      // Timeline event
      await tx.studentTimelineEvent.create({
        data: {
          studentId: dto.studentId,
          eventType: TimelineEventType.ENROLLMENT_CREATED,
          actorId: actor.id,
          title: `دانشجو در دوره «${course.title}» ثبت‌نام شد`,
          metadata: {
            enrollmentId: created.id,
            courseId: dto.courseId,
            courseGroupId: dto.courseGroupId ?? null,
            finalAmountToman: finalAmount,
          },
        },
      })

      return created
    })

    return this.toEnrollmentDto(enrollment)
  }

  // ─── Update ────────────────────────────────────────────────

  async update(id: string, dto: UpdateEnrollmentDto, actor: CurrentUser): Promise<EnrollmentDto> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null },
      include: { payment: { select: { _count: { select: { transactions: true } } } } },
    })
    if (!enrollment) throw new NotFoundException('ثبت‌نام یافت نشد')

    // Block money edits if transactions exist
    const hasTransactions = (enrollment.payment?._count?.transactions ?? 0) > 0
    if (hasTransactions && (dto.tuitionAmountToman !== undefined || dto.discountAmountToman !== undefined)) {
      throw new BadRequestException('تغییر مبلغ پس از ثبت پرداخت امکان‌پذیر نیست')
    }

    let finalAmountToman = enrollment.finalAmountToman
    if (dto.tuitionAmountToman !== undefined || dto.discountAmountToman !== undefined) {
      const tuition = dto.tuitionAmountToman ?? enrollment.tuitionAmountToman
      const discount = dto.discountAmountToman ?? enrollment.discountAmountToman
      finalAmountToman = tuition - discount
      if (finalAmountToman < 0) throw new BadRequestException('مبلغ نهایی نمی‌تواند منفی باشد')
    }

    const prevStatus = enrollment.status

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.enrollment.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.tuitionAmountToman !== undefined && { tuitionAmountToman: dto.tuitionAmountToman }),
          ...(dto.discountAmountToman !== undefined && { discountAmountToman: dto.discountAmountToman }),
          ...(dto.tuitionAmountToman !== undefined || dto.discountAmountToman !== undefined
            ? { finalAmountToman }
            : {}),
        },
        include: ENROLLMENT_INCLUDE,
      })

      if (dto.status && dto.status !== prevStatus) {
        await tx.studentTimelineEvent.create({
          data: {
            studentId: enrollment.studentId,
            eventType: TimelineEventType.ENROLLMENT_STATUS_CHANGED,
            actorId: actor.id,
            title: `وضعیت ثبت‌نام به «${dto.status}» تغییر کرد`,
            metadata: { enrollmentId: id, prevStatus, newStatus: dto.status },
          },
        })
      }

      return result
    })

    return this.toEnrollmentDto(updated)
  }

  // ─── DTO mapper ────────────────────────────────────────────

  private toEnrollmentDto(e: {
    id: string
    studentId: string
    courseId: string
    courseGroupId: string | null
    status: string
    tuitionAmountToman: number
    discountAmountToman: number
    finalAmountToman: number
    enrollmentDate: Date
    notes: string | null
    createdById: string
    createdAt: Date
    updatedAt: Date
    student: {
      id: string
      studentCode: string
      user: { profile: { firstName: string; lastName: string } | null }
    }
    course: { id: string; title: string }
    courseGroup: { id: string; name: string } | null
    payment: {
      id: string
      status: string
      paidAmountToman: number
      remainingAmountToman: number
    } | null
  }): EnrollmentDto {
    const profile = e.student.user.profile
    const studentName = profile ? `${profile.firstName} ${profile.lastName}` : e.studentId

    return {
      id: e.id,
      studentId: e.studentId,
      studentName,
      studentCode: e.student.studentCode,
      courseId: e.courseId,
      courseName: e.course.title,
      courseGroupId: e.courseGroupId,
      courseGroupName: e.courseGroup?.name ?? null,
      status: e.status as EnrollmentStatus,
      tuitionAmountToman: e.tuitionAmountToman,
      discountAmountToman: e.discountAmountToman,
      finalAmountToman: e.finalAmountToman,
      enrollmentDate: e.enrollmentDate.toISOString(),
      notes: e.notes,
      createdById: e.createdById,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      paymentId: e.payment?.id,
      paymentStatus: e.payment?.status,
      paidAmountToman: e.payment?.paidAmountToman,
      remainingAmountToman: e.payment?.remainingAmountToman,
    }
  }
}
