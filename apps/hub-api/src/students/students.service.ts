import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { UserRole, UserStatus, StudentStatus, TimelineEventType } from '@irno/types'
import type { CurrentUser, StudentDto, StudentTimelineEventDto, PaginatedStudents } from '@irno/types'
import type { CreateStudentDto } from './dto/create-student.dto'
import type { UpdateStudentDto } from './dto/update-student.dto'
import type { AddStudentNoteDto } from './dto/add-student-note.dto'

interface ListStudentsOptions {
  search?: string
  status?: StudentStatus
  page?: number
  limit?: number
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ────────────────────────────────────────────────────────────────

  async findAll(options: ListStudentsOptions = {}): Promise<PaginatedStudents> {
    const { search, status, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { studentCode: { contains: search, mode: 'insensitive' as const } },
          {
            user: {
              OR: [
                { mobile: { contains: search } },
                { email: { contains: search, mode: 'insensitive' as const } },
                {
                  profile: {
                    OR: [
                      { firstName: { contains: search, mode: 'insensitive' as const } },
                      { lastName: { contains: search, mode: 'insensitive' as const } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }),
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: { profile: true } },
        },
      }),
      this.prisma.student.count({ where }),
    ])

    return {
      data: students.map((s: Parameters<typeof this.toStudentDto>[0]) => this.toStudentDto(s)),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<StudentDto> {
    const student = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { include: { profile: true } },
        originApplicant: {
          select: {
            interestedCourseId: true,
            interestedCourseGroupId: true,
            interestedTopic: true,
            interestedCourse: { select: { id: true, title: true } },
            interestedCourseGroup: { select: { id: true, name: true } },
          },
        },
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: {
                id: true,
                mobile: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })

    if (!student) throw new NotFoundException('دانشجو یافت نشد')
    return this.toStudentDto(student, true)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateStudentDto, actor: CurrentUser): Promise<StudentDto> {
    // Check mobile uniqueness
    const existingUser = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile, deletedAt: null },
    })
    if (existingUser) {
      throw new ConflictException('این شماره موبایل قبلاً در سیستم ثبت شده است')
    }

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          mobile: dto.mobile,
          email: dto.email ?? null,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      })

      await tx.profile.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          city: dto.city ?? null,
        },
      })

      const studentCode = await this.generateStudentCode(tx)

      const newStudent = await tx.student.create({
        data: {
          userId: user.id,
          studentCode,
          status: dto.status ?? StudentStatus.ACTIVE,
          internalNotes: dto.internalNotes ?? null,
        },
      })

      await tx.studentTimelineEvent.create({
        data: {
          studentId: newStudent.id,
          eventType: TimelineEventType.STUDENT_CREATED,
          actorId: actor.id,
          title: `دانشجو به صورت مستقیم ثبت شد (${studentCode})`,
          isManual: false,
        },
      })

      return newStudent
    })

    return this.findOne(student.id)
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateStudentDto, actor: CurrentUser): Promise<StudentDto> {
    const student = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
      include: { user: { include: { profile: true } } },
    })
    if (!student) throw new NotFoundException('دانشجو یافت نشد')

    const statusChanged = dto.status !== undefined && dto.status !== student.status
    const previousStatus = student.status

    await this.prisma.$transaction(async (tx) => {
      // Update student record
      await tx.student.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
        },
      })

      // Update profile
      if (
        dto.firstName !== undefined ||
        dto.lastName !== undefined ||
        dto.city !== undefined ||
        dto.avatarUrl !== undefined ||
        dto.telegramHandle !== undefined
      ) {
        if (student.user.profile) {
          await tx.profile.update({
            where: { userId: student.userId },
            data: {
              ...(dto.firstName !== undefined && { firstName: dto.firstName }),
              ...(dto.lastName !== undefined && { lastName: dto.lastName }),
              ...(dto.city !== undefined && { city: dto.city }),
              ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
              ...(dto.telegramHandle !== undefined && { telegramHandle: dto.telegramHandle }),
            },
          })
        }
      }

      // Update user email if provided
      if (dto.email !== undefined) {
        await tx.user.update({
          where: { id: student.userId },
          data: { email: dto.email },
        })
      }

      // Timeline event for status change
      if (statusChanged) {
        await tx.studentTimelineEvent.create({
          data: {
            studentId: id,
            eventType: TimelineEventType.STUDENT_STATUS_CHANGED,
            actorId: actor.id,
            title: `وضعیت دانشجو تغییر کرد: از «${this.studentStatusLabel(previousStatus as StudentStatus)}» به «${this.studentStatusLabel(dto.status!)}»`,
            metadata: { from: previousStatus, to: dto.status },
            isManual: false,
          },
        })
      }
    })

    return this.findOne(id)
  }

  // ─── Add note ─────────────────────────────────────────────────────────────

  async addNote(id: string, dto: AddStudentNoteDto, actor: CurrentUser): Promise<StudentTimelineEventDto> {
    const student = await this.prisma.student.findFirst({ where: { id, deletedAt: null } })
    if (!student) throw new NotFoundException('دانشجو یافت نشد')

    const event = await this.prisma.studentTimelineEvent.create({
      data: {
        studentId: id,
        eventType: TimelineEventType.STUDENT_NOTE_ADDED,
        actorId: actor.id,
        title: dto.content,
        isManual: true,
      },
      include: {
        actor: {
          select: {
            id: true,
            mobile: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    return this.toEventDto(event)
  }

  // ─── Get timeline ─────────────────────────────────────────────────────────

  async getTimeline(
    id: string,
    page = 1,
    limit = 50,
    eventType?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ data: StudentTimelineEventDto[]; total: number; page: number; limit: number }> {
    const student = await this.prisma.student.findFirst({ where: { id, deletedAt: null } })
    if (!student) throw new NotFoundException('دانشجو یافت نشد')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { studentId: id }
    if (eventType) where['eventType'] = eventType
    if (fromDate || toDate) {
      where['createdAt'] = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lte: new Date(toDate) } : {}),
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.studentTimelineEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              mobile: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.studentTimelineEvent.count({ where }),
    ])

    return { data: events.map((e: Parameters<typeof this.toEventDto>[0]) => this.toEventDto(e)), total, page, limit }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateStudentCode(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const count = await tx.student.count()
    const seq = String(count + 1).padStart(4, '0')
    const code = `IRN-${year}-${seq}`

    const collision = await tx.student.findFirst({ where: { studentCode: code } })
    if (collision) {
      const ts = Date.now().toString().slice(-5)
      return `IRN-${year}-${ts}`
    }

    return code
  }

  private studentStatusLabel(status: StudentStatus): string {
    const labels: Record<StudentStatus, string> = {
      [StudentStatus.ACTIVE]: 'فعال',
      [StudentStatus.PAUSED]: 'متوقف',
      [StudentStatus.GRADUATED]: 'فارغ‌التحصیل',
      [StudentStatus.CANCELLED]: 'انصراف داده',
    }
    return labels[status] ?? status
  }

  private toStudentDto(
    student: {
      id: string
      userId: string
      studentCode: string
      originApplicantId: string | null
      status: string
      internalNotes: string | null
      createdAt: Date
      updatedAt: Date
      user: {
        id: string
        mobile: string
        email: string | null
        profile: {
          firstName: string
          lastName: string
          city: string | null
          avatarUrl: string | null
        } | null
      }
      originApplicant?: {
        interestedCourseId: string | null
        interestedCourseGroupId: string | null
        interestedTopic: string | null
        interestedCourse: { id: string; title: string } | null
        interestedCourseGroup: { id: string; name: string } | null
      } | null
      timelineEvents?: Array<{
        id: string
        studentId: string
        eventType: string
        actorId: string | null
        title: string
        metadata: unknown
        isManual: boolean
        createdAt: Date
        actor?: {
          id: string
          mobile: string
          profile: { firstName: string; lastName: string } | null
        } | null
      }>
    },
    includeTimeline = false,
  ): StudentDto {
    const { user } = student
    const profile = user.profile

    return {
      id: student.id,
      userId: student.userId,
      studentCode: student.studentCode,
      originApplicantId: student.originApplicantId,
      status: student.status as StudentDto['status'],
      internalNotes: student.internalNotes,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      fullName: profile ? `${profile.firstName} ${profile.lastName}` : user.mobile,
      mobile: user.mobile,
      email: user.email,
      city: profile?.city ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      interestedCourseName: student.originApplicant?.interestedCourse?.title ?? null,
      interestedCourseId: student.originApplicant?.interestedCourseId ?? null,
      interestedCourseGroupId: student.originApplicant?.interestedCourseGroupId ?? null,
      interestedCourseGroupName: student.originApplicant?.interestedCourseGroup?.name ?? null,
      interestedTopic: student.originApplicant?.interestedTopic ?? null,
      ...(includeTimeline && student.timelineEvents
        ? { timeline: student.timelineEvents.map((e) => this.toEventDto(e as Parameters<typeof this.toEventDto>[0])) }
        : {}),
    }
  }

  private toEventDto(event: {
    id: string
    studentId: string
    eventType: string
    actorId: string | null
    title: string
    metadata: unknown
    isManual: boolean
    createdAt: Date
    actor?: {
      id: string
      mobile: string
      profile: { firstName: string; lastName: string } | null
    } | null
  }): StudentTimelineEventDto {
    return {
      id: event.id,
      studentId: event.studentId,
      eventType: event.eventType as StudentTimelineEventDto['eventType'],
      actorId: event.actorId,
      actorName: event.actor
        ? event.actor.profile
          ? `${event.actor.profile.firstName} ${event.actor.profile.lastName}`
          : event.actor.mobile
        : null,
      title: event.title,
      metadata: (event.metadata as Record<string, unknown>) ?? null,
      isManual: event.isManual,
      createdAt: event.createdAt.toISOString(),
    }
  }
}
