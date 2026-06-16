import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { UserRole, UserStatus, ApplicantStatus, ApplicantSource, TimelineEventType } from '@irno/types'
import type { CurrentUser, ApplicantDto, ApplicantNoteDto, PaginatedApplicants, StudentDto, StudentTimelineEventDto } from '@irno/types'
import type { CreateApplicantDto } from './dto/create-applicant.dto'
import type { UpdateApplicantDto } from './dto/update-applicant.dto'
import type { AddApplicantNoteDto } from './dto/add-applicant-note.dto'
import type { AssignApplicantDto } from './dto/assign-applicant.dto'
import type { ConvertApplicantDto } from './dto/convert-applicant.dto'

interface ListApplicantsOptions {
  search?: string
  status?: ApplicantStatus
  source?: ApplicantSource
  assignedToUserId?: string
  followUpFrom?: string
  followUpTo?: string
  page?: number
  limit?: number
}

@Injectable()
export class ApplicantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ────────────────────────────────────────────────────────────────

  async findAll(options: ListApplicantsOptions = {}): Promise<PaginatedApplicants> {
    const {
      search,
      status,
      source,
      assignedToUserId,
      followUpFrom,
      followUpTo,
      page = 1,
      limit = 20,
    } = options
    const skip = (page - 1) * limit

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(source && { source }),
      ...(assignedToUserId && { assignedToUserId }),
      ...(followUpFrom || followUpTo
        ? {
            followUpDate: {
              ...(followUpFrom && { gte: new Date(followUpFrom) }),
              ...(followUpTo && { lte: new Date(followUpTo) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { mobile: { contains: search } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [applicants, total] = await Promise.all([
      this.prisma.applicant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
          createdBy: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
          interestedCourse: { select: { id: true, title: true } },
          interestedCourseGroup: { select: { id: true, name: true } },
        },
      }),
      this.prisma.applicant.count({ where }),
    ])

    return {
      data: applicants.map((a: Parameters<typeof this.toApplicantDto>[0]) => this.toApplicantDto(a)),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<ApplicantDto> {
    const applicant = await this.prisma.applicant.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        createdBy: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
          },
        },
      },
    })

    if (!applicant) throw new NotFoundException('متقاضی یافت نشد')
    return this.toApplicantDto(applicant, true)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateApplicantDto, actor: CurrentUser): Promise<ApplicantDto> {
    const applicant = await this.prisma.applicant.create({
      data: {
        fullName: dto.fullName,
        mobile: dto.mobile,
        email: dto.email ?? null,
        city: dto.city ?? null,
        source: dto.source ?? ApplicantSource.OTHER,
        interestedTopic: dto.interestedTopic ?? null,
        status: dto.status ?? ApplicantStatus.NEW_APPLICANT,
        consultationNotes: dto.consultationNotes ?? null,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        assignedToUserId: dto.assignedToUserId ?? null,
        interestedCourseId: dto.interestedCourseId ?? null,
        interestedCourseGroupId: (dto as any).interestedCourseGroupId ?? null,
        createdById: actor.id,
      },
      include: {
        assignedTo: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        createdBy: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
        interestedCourse: { select: { id: true, title: true } },
      },
    })

    return this.toApplicantDto(applicant)
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateApplicantDto, actor: CurrentUser): Promise<ApplicantDto> {
    const existing = await this.prisma.applicant.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundException('متقاضی یافت نشد')

    const statusChanged = dto.status !== undefined && dto.status !== existing.status
    const previousStatus = existing.status

    const applicant = await this.prisma.applicant.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.mobile !== undefined && { mobile: dto.mobile }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.interestedTopic !== undefined && { interestedTopic: dto.interestedTopic }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.consultationNotes !== undefined && { consultationNotes: dto.consultationNotes }),
        ...(dto.followUpDate !== undefined && {
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        }),
        ...(dto.assignedToUserId !== undefined && { assignedToUserId: dto.assignedToUserId }),
        ...(dto.interestedCourseId !== undefined && { interestedCourseId: dto.interestedCourseId }),
        ...((dto as any).interestedCourseGroupId !== undefined && { interestedCourseGroupId: (dto as any).interestedCourseGroupId }),
      },
      include: {
        assignedTo: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        createdBy: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
        interestedCourse: { select: { id: true, title: true } },
      },
    })

    // Create timeline events for students who originated from this applicant
    if (statusChanged) {
      const student = await this.prisma.student.findFirst({
        where: { originApplicantId: id, deletedAt: null },
      })
      if (student) {
        await this.prisma.studentTimelineEvent.create({
          data: {
            studentId: student.id,
            eventType: TimelineEventType.APPLICANT_STATUS_CHANGED,
            actorId: actor.id,
            title: `وضعیت متقاضی تغییر کرد: از «${this.statusLabel(previousStatus as ApplicantStatus)}» به «${this.statusLabel(dto.status!)}»`,
            metadata: { from: previousStatus, to: dto.status },
            isManual: false,
          },
        })
      }
    }

    return this.toApplicantDto(applicant)
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.applicant.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundException('متقاضی یافت نشد')
    if (existing.convertedToStudentId) {
      throw new BadRequestException('متقاضیان تبدیل‌شده قابل حذف نیستند')
    }
    await this.prisma.applicant.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  // ─── Notes ────────────────────────────────────────────────────────────────

  async addNote(id: string, dto: AddApplicantNoteDto, actor: CurrentUser): Promise<ApplicantNoteDto> {
    const applicant = await this.prisma.applicant.findFirst({ where: { id, deletedAt: null } })
    if (!applicant) throw new NotFoundException('متقاضی یافت نشد')

    const note = await this.prisma.applicantNote.create({
      data: {
        applicantId: id,
        authorId: actor.id,
        content: dto.content,
      },
      include: {
        author: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
      },
    })

    return this.toNoteDto(note)
  }

  async getNotes(id: string): Promise<ApplicantNoteDto[]> {
    const applicant = await this.prisma.applicant.findFirst({ where: { id, deletedAt: null } })
    if (!applicant) throw new NotFoundException('متقاضی یافت نشد')

    const notes = await this.prisma.applicantNote.findMany({
      where: { applicantId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
      },
    })

    return notes.map((n: Parameters<typeof this.toNoteDto>[0]) => this.toNoteDto(n))
  }

  // ─── Assign ───────────────────────────────────────────────────────────────

  async assign(id: string, dto: AssignApplicantDto): Promise<ApplicantDto> {
    const applicant = await this.prisma.applicant.findFirst({ where: { id, deletedAt: null } })
    if (!applicant) throw new NotFoundException('متقاضی یافت نشد')

    if (dto.assignedToUserId) {
      const staff = await this.prisma.user.findFirst({
        where: { id: dto.assignedToUserId, deletedAt: null },
      })
      if (!staff) throw new NotFoundException('کاربر مورد نظر یافت نشد')
    }

    const updated = await this.prisma.applicant.update({
      where: { id },
      data: { assignedToUserId: dto.assignedToUserId ?? null },
      include: {
        assignedTo: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        createdBy: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
      },
    })

    return this.toApplicantDto(updated)
  }

  // ─── Convert to student ───────────────────────────────────────────────────

  async convert(id: string, dto: ConvertApplicantDto, actor: CurrentUser): Promise<StudentDto> {
    const applicant = await this.prisma.applicant.findFirst({ where: { id, deletedAt: null } })
    if (!applicant) throw new NotFoundException('متقاضی یافت نشد')

    if (applicant.convertedToStudentId) {
      throw new ConflictException('این متقاضی قبلاً به دانشجو تبدیل شده است')
    }

    // Check mobile collision
    const existingUser = await this.prisma.user.findFirst({
      where: { mobile: applicant.mobile, deletedAt: null },
    })
    if (existingUser) {
      throw new ConflictException('این شماره موبایل قبلاً در سیستم ثبت شده است')
    }

    // All-or-nothing transaction
    const student = await this.prisma.$transaction(async (tx) => {
      // Create user with STUDENT role
      const user = await tx.user.create({
        data: {
          mobile: applicant.mobile,
          email: applicant.email ?? null,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          // No passwordHash — students don't have portal access in Phase 3
        },
      })

      // Create profile
      // Derive first/last name from fullName if not explicitly provided
      const nameParts = applicant.fullName.trim().split(/\s+/)
      const firstName = dto.firstName ?? (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] ?? '')
      const lastName = dto.lastName ?? (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '')

      await tx.profile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          city: dto.city ?? applicant.city ?? null,
        },
      })

      // Generate student code
      const studentCode = await this.generateStudentCode(tx)

      // Create student
      const newStudent = await tx.student.create({
        data: {
          userId: user.id,
          studentCode,
          originApplicantId: applicant.id,
          status: 'ACTIVE',
          internalNotes: dto.internalNotes ?? null,
        },
      })

      // Update applicant
      await tx.applicant.update({
        where: { id },
        data: {
          convertedToStudentId: newStudent.id,
          convertedAt: new Date(),
          status: ApplicantStatus.REGISTERED,
        },
      })

      // Create timeline event
      await tx.studentTimelineEvent.create({
        data: {
          studentId: newStudent.id,
          eventType: TimelineEventType.APPLICANT_CONVERTED_TO_STUDENT,
          actorId: actor.id,
          title: `از متقاضی به دانشجو تبدیل شد (${studentCode})`,
          metadata: { applicantId: applicant.id, applicantName: applicant.fullName },
          isManual: false,
        },
      })

      await tx.studentTimelineEvent.create({
        data: {
          studentId: newStudent.id,
          eventType: TimelineEventType.STUDENT_CREATED,
          actorId: actor.id,
          title: 'پروفایل دانشجویی ایجاد شد',
          isManual: false,
        },
      })

      return newStudent
    })

    // Return full student DTO
    return this.buildStudentDto(student.id)
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateStudentCode(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const count = await tx.student.count()
    const seq = String(count + 1).padStart(4, '0')
    const code = `IRN-${year}-${seq}`

    // Check uniqueness — if collision (concurrent creates), fall back to timestamp suffix
    const collision = await tx.student.findFirst({ where: { studentCode: code } })
    if (collision) {
      const ts = Date.now().toString().slice(-5)
      return `IRN-${year}-${ts}`
    }

    return code
  }

  private statusLabel(status: ApplicantStatus): string {
    const labels: Record<ApplicantStatus, string> = {
      [ApplicantStatus.NEW_APPLICANT]:     'متقاضی جدید',
      [ApplicantStatus.CONTACTED]:         'تماس گرفته شده',
      [ApplicantStatus.CONSULTED]:         'مشاوره شده',
      [ApplicantStatus.READY_TO_REGISTER]: 'آماده ثبت‌نام',
      [ApplicantStatus.REGISTERED]:        'ثبت‌نام شده',
      [ApplicantStatus.NEEDS_FOLLOW_UP]:   'نیازمند پیگیری',
      [ApplicantStatus.NOT_INTERESTED]:    'منصرف شده',
      [ApplicantStatus.CANCELLED]:         'لغو شده',
    }
    return labels[status] ?? status
  }

  private toApplicantDto(
    applicant: {
      id: string
      fullName: string
      mobile: string
      email: string | null
      city: string | null
      source: string
      interestedTopic: string | null
      interestedCourseId?: string | null
      interestedCourseGroupId?: string | null
      interestedCourse?: { id: string; title: string } | null
      interestedCourseGroup?: { id: string; name: string } | null
      status: string
      consultationNotes: string | null
      followUpDate: Date | null
      assignedToUserId: string | null
      convertedToStudentId: string | null
      convertedAt: Date | null
      createdById: string
      createdAt: Date
      updatedAt: Date
      assignedTo?: {
        id: string
        profile: { firstName: string; lastName: string } | null
      } | null
      createdBy?: {
        id: string
        mobile: string
        profile: { firstName: string; lastName: string } | null
      }
      notes?: Array<{
        id: string
        applicantId: string
        authorId: string
        content: string
        createdAt: Date
        author: {
          id: string
          mobile: string
          profile: { firstName: string; lastName: string } | null
        }
      }>
    },
    includeNotes = false,
  ): ApplicantDto {
    return {
      id: applicant.id,
      fullName: applicant.fullName,
      mobile: applicant.mobile,
      email: applicant.email,
      city: applicant.city,
      source: applicant.source as ApplicantDto['source'],
      interestedTopic: applicant.interestedTopic,
      interestedCourseId: applicant.interestedCourseId ?? null,
      interestedCourseName: applicant.interestedCourse?.title ?? null,
      interestedCourseGroupId: applicant.interestedCourseGroupId ?? null,
      interestedCourseGroupName: applicant.interestedCourseGroup?.name ?? null,
      status: applicant.status as ApplicantDto['status'],
      consultationNotes: applicant.consultationNotes,
      followUpDate: applicant.followUpDate?.toISOString() ?? null,
      assignedToUserId: applicant.assignedToUserId,
      assignedToName: applicant.assignedTo
        ? applicant.assignedTo.profile
          ? `${applicant.assignedTo.profile.firstName} ${applicant.assignedTo.profile.lastName}`
          : null
        : null,
      convertedToStudentId: applicant.convertedToStudentId,
      convertedAt: applicant.convertedAt?.toISOString() ?? null,
      createdById: applicant.createdById,
      createdByName: applicant.createdBy
        ? applicant.createdBy.profile
          ? `${applicant.createdBy.profile.firstName} ${applicant.createdBy.profile.lastName}`
          : applicant.createdBy.mobile
        : applicant.createdById,
      createdAt: applicant.createdAt.toISOString(),
      updatedAt: applicant.updatedAt.toISOString(),
      ...(includeNotes && applicant.notes
        ? { notes: applicant.notes.map((n) => this.toNoteDto(n)) }
        : {}),
    }
  }

  private toNoteDto(note: {
    id: string
    applicantId: string
    authorId: string
    content: string
    createdAt: Date
    author: {
      id: string
      mobile: string
      profile: { firstName: string; lastName: string } | null
    }
  }): ApplicantNoteDto {
    return {
      id: note.id,
      applicantId: note.applicantId,
      authorId: note.authorId,
      authorName: note.author.profile
        ? `${note.author.profile.firstName} ${note.author.profile.lastName}`
        : note.author.mobile,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
    }
  }

  private async buildStudentDto(studentId: string): Promise<StudentDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          include: { profile: true },
        },
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            actor: { select: { id: true, profile: { select: { firstName: true, lastName: true } }, mobile: true } },
          },
        },
      },
    })

    if (!student) throw new NotFoundException('دانشجو یافت نشد')

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
      interestedCourseName: null,
      interestedCourseId: null,
      interestedCourseGroupId: null,
      interestedCourseGroupName: null,
      interestedTopic: null,
      timeline: student.timelineEvents.map((e: {
        id: string
        studentId: string
        eventType: string
        actorId: string | null
        title: string
        metadata: unknown
        isManual: boolean
        createdAt: Date
        actor?: { id: string; mobile: string; profile: { firstName: string; lastName: string } | null } | null
      }) => ({
        id: e.id,
        studentId: e.studentId,
        eventType: e.eventType as StudentTimelineEventDto['eventType'],
        actorId: e.actorId,
        actorName: e.actor
          ? e.actor.profile
            ? `${e.actor.profile.firstName} ${e.actor.profile.lastName}`
            : e.actor.mobile
          : null,
        title: e.title,
        metadata: (e.metadata as Record<string, unknown>) ?? null,
        isManual: e.isManual,
        createdAt: e.createdAt.toISOString(),
      })),
    }
  }
}
