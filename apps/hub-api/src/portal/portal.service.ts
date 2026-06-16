import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  ApplicantStatus,
  InstallmentStatus,
  MeetinoMeetingSourceType,
  UserRole,
} from '@irno/types'
import type {
  CurrentUser,
  PortalMeDto,
  PortalApplicantSummaryDto,
  PortalStudentSummaryDto,
  PortalEnrollmentDto,
  PortalPaymentDto,
  PortalInstallmentDto,
  PortalEventItemDto,
  PortalMeetinoLinkDto,
  PortalSection,
  PortalSkillDto,
  PortalCreditDto,
} from '@irno/types'
import type { UpdatePortalProfileDto } from './dto/update-portal-profile.dto'

/** Roles that belong to portal users (non-staff) */
const PORTAL_ROLES: UserRole[] = [UserRole.STUDENT, UserRole.APPLICANT, UserRole.GUEST, UserRole.LEAD]

/** Roles that are staff and should use the admin hub */
export const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.TEACHER,
  UserRole.MENTOR,
]

/**
 * Persian next-steps message by applicant status.
 */
function applicantNextSteps(status: ApplicantStatus): string {
  const map: Record<ApplicantStatus, string> = {
    [ApplicantStatus.NEW_APPLICANT]: 'درخواست شما دریافت شد. تیم ایرنو به‌زودی با شما تماس می‌گیرد.',
    [ApplicantStatus.CONTACTED]: 'تیم ایرنو با شما تماس گرفته است. منتظر مشاوره باشید.',
    [ApplicantStatus.CONSULTED]: 'مشاوره انجام شد. در انتظار تأیید ثبت‌نام هستید.',
    [ApplicantStatus.READY_TO_REGISTER]: 'آماده ثبت‌نام هستید. لطفاً با تیم ایرنو تماس بگیرید.',
    [ApplicantStatus.REGISTERED]: 'ثبت‌نام شما تکمیل شده است.',
    [ApplicantStatus.NEEDS_FOLLOW_UP]: 'نیاز به پیگیری وجود دارد. تیم ایرنو به‌زودی تماس می‌گیرد.',
    [ApplicantStatus.NOT_INTERESTED]: 'اطلاعات شما ذخیره شده است.',
    [ApplicantStatus.CANCELLED]: 'درخواست شما لغو شده است.',
  }
  return map[status] ?? ''
}

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── /portal/me ───────────────────────────────────────────────────────────

  async getPortalMe(currentUser: CurrentUser): Promise<PortalMeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { profile: true },
    })
    if (!user) throw new NotFoundException('کاربر یافت نشد')

    const [applicantSummary, studentSummary] = await Promise.all([
      this.findApplicantSummary(currentUser),
      this.findStudentSummary(currentUser),
    ])

    const availableSections = this.computeAvailableSections(
      currentUser.role,
      studentSummary,
    )

    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as any,
      /** Safe boolean — never expose passwordHash */
      hasPassword: Boolean(user.passwordHash),
      profile: user.profile
        ? {
            id: user.profile.id,
            userId: user.profile.userId,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            avatarUrl: user.profile.avatarUrl,
            city: user.profile.city,
            telegramHandle: user.profile.telegramHandle,
          }
        : null,
      applicantSummary,
      studentSummary,
      availableSections,
    }
  }

  // ─── /portal/applicant ─────────────────────────────────────────────────────

  async getPortalApplicant(currentUser: CurrentUser): Promise<PortalApplicantSummaryDto> {
    const summary = await this.findApplicantSummary(currentUser)
    if (!summary) {
      throw new NotFoundException('رکورد متقاضی یافت نشد')
    }
    return summary
  }

  // ─── /portal/student ───────────────────────────────────────────────────────

  async getPortalStudent(currentUser: CurrentUser): Promise<PortalStudentSummaryDto> {
    const summary = await this.findStudentSummary(currentUser)
    if (!summary) {
      throw new NotFoundException('رکورد دانشجو یافت نشد')
    }
    return summary
  }

  // ─── /portal/enrollments ───────────────────────────────────────────────────

  async getPortalEnrollments(currentUser: CurrentUser): Promise<PortalEnrollmentDto[]> {
    const student = await this.findStudentForUser(currentUser.id)
    if (!student) return []

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, deletedAt: null },
      orderBy: { enrollmentDate: 'desc' },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        courseGroup: { select: { id: true, name: true } },
      },
    })

    // Build courseGroupId → Meetino join URL map in one query
    const groupIds = enrollments
      .map((e: { courseGroupId: string | null }) => e.courseGroupId)
      .filter((id: string | null): id is string => !!id)

    const meetinoRefs = groupIds.length > 0
      ? await this.prisma.meetinoMeetingReference.findMany({
          where: {
            sourceType: MeetinoMeetingSourceType.COURSE_GROUP,
            sourceId: { in: groupIds },
            deletedAt: null,
          },
          select: { sourceId: true, joinUrl: true },
        })
      : []

    const meetinoByGroup = new Map<string, string>(
      meetinoRefs.map((r: { sourceId: string; joinUrl: string }) => [r.sourceId, r.joinUrl]),
    )

    return enrollments.map((e: any) => ({
      id: e.id,
      enrollmentDate: e.enrollmentDate.toISOString(),
      status: e.status,
      course: {
        id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
      },
      courseGroup: e.courseGroup
        ? { id: e.courseGroup.id, name: e.courseGroup.name }
        : null,
      meetinoJoinUrl: e.courseGroupId ? (meetinoByGroup.get(e.courseGroupId) ?? null) : null,
    }))
  }

  // ─── /portal/payments ─────────────────────────────────────────────────────

  async getPortalPayments(currentUser: CurrentUser): Promise<PortalPaymentDto[]> {
    const student = await this.findStudentForUser(currentUser.id)
    if (!student) return []

    const payments = await this.prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: {
        enrollment: {
          select: {
            id: true,
            course: { select: { title: true } },
            courseGroup: { select: { name: true } },
          },
        },
      },
    })

    return payments.map((p: any) => ({
      id: p.id,
      totalAmountToman: p.totalAmountToman,
      paidAmountToman: p.paidAmountToman,
      remainingAmountToman: p.remainingAmountToman,
      status: p.status,
      courseName: p.enrollment?.course?.title ?? null,
      courseGroupName: p.enrollment?.courseGroup?.name ?? null,
      enrollmentId: p.enrollmentId,
    }))
  }

  // ─── /portal/installments ─────────────────────────────────────────────────

  async getPortalInstallments(currentUser: CurrentUser): Promise<PortalInstallmentDto[]> {
    const student = await this.findStudentForUser(currentUser.id)
    if (!student) return []

    // Get payment IDs for this student
    const payments = await this.prisma.payment.findMany({
      where: { studentId: student.id },
      select: { id: true },
    })
    const paymentIds = payments.map((p: { id: string }) => p.id)

    if (paymentIds.length === 0) return []

    const installments = await this.prisma.installment.findMany({
      where: { paymentId: { in: paymentIds } },
      orderBy: { dueDate: 'asc' },
      include: {
        payment: {
          select: {
            enrollment: {
              select: {
                course: { select: { title: true } },
                courseGroup: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    const now = new Date()

    return installments.map((i: any) => {
      // Compute overdue on read — same pattern as admin side
      const effectiveStatus =
        i.status === InstallmentStatus.PENDING && new Date(i.dueDate) < now
          ? InstallmentStatus.OVERDUE
          : i.status

      return {
        id: i.id,
        amountToman: i.amountToman,
        dueDate: i.dueDate.toISOString(),
        status: effectiveStatus,
        courseName: i.payment?.enrollment?.course?.title ?? null,
        courseGroupName: i.payment?.enrollment?.courseGroup?.name ?? null,
        paymentId: i.paymentId,
      }
    })
  }

  // ─── /portal/events ───────────────────────────────────────────────────────

  async getPortalEvents(currentUser: CurrentUser): Promise<PortalEventItemDto[]> {
    const student = await this.findStudentForUser(currentUser.id)

    // Get all event registrations for current user
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        deletedAt: null,
        OR: [
          { userId: currentUser.id },
          ...(student ? [{ studentId: student.id }] : []),
        ],
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            eventType: true,
            deliveryMode: true,
            registrationMode: true,
            startAt: true,
            endAt: true,
            status: true,
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    })

    // Build eventId → meetino join URL map
    const registeredEventIds = registrations.map((r: any) => r.eventId)
    const meetinoRefs = registeredEventIds.length > 0
      ? await this.prisma.meetinoMeetingReference.findMany({
          where: {
            sourceType: MeetinoMeetingSourceType.EVENT,
            sourceId: { in: registeredEventIds },
            deletedAt: null,
          },
          select: { sourceId: true, joinUrl: true },
        })
      : []

    const meetinoByEvent = new Map<string, string>(
      meetinoRefs.map((r: { sourceId: string; joinUrl: string }) => [r.sourceId, r.joinUrl]),
    )

    return registrations.map((r: any) => ({
      id: r.event.id,
      title: r.event.title,
      description: r.event.description,
      eventType: r.event.eventType,
      deliveryMode: r.event.deliveryMode,
      registrationMode: r.event.registrationMode,
      startAt: r.event.startAt.toISOString(),
      endAt: r.event.endAt ? r.event.endAt.toISOString() : null,
      status: r.event.status,
      registrationStatus: r.status,
      registrationId: r.id,
      meetinoJoinUrl: meetinoByEvent.get(r.eventId) ?? null,
      isRegistered: true,
    }))
  }

  // ─── /portal/meetino-links ─────────────────────────────────────────────────

  async getPortalMeetinoLinks(currentUser: CurrentUser): Promise<PortalMeetinoLinkDto[]> {
    const student = await this.findStudentForUser(currentUser.id)

    const results: PortalMeetinoLinkDto[] = []

    // 1. Course group Meetino links from active enrollments
    if (student) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          studentId: student.id,
          deletedAt: null,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
        select: {
          courseGroupId: true,
          courseGroup: { select: { id: true, name: true } },
        },
      })

      const groupIds = enrollments
        .map((e: any) => e.courseGroupId)
        .filter((id: string | null): id is string => !!id)

      if (groupIds.length > 0) {
        const groupRefs = await this.prisma.meetinoMeetingReference.findMany({
          where: {
            sourceType: MeetinoMeetingSourceType.COURSE_GROUP,
            sourceId: { in: groupIds },
            deletedAt: null,
          },
        })

        const groupNameMap = new Map<string, string>(
          enrollments
            .filter((e: any) => e.courseGroupId && e.courseGroup)
            .map((e: any) => [e.courseGroupId!, e.courseGroup!.name as string]),
        )

        for (const ref of groupRefs as any[]) {
          results.push({
            id: ref.id,
            title: ref.title,
            sourceType: ref.sourceType,
            sourceId: ref.sourceId,
            sourceLabel: groupNameMap.get(ref.sourceId) ?? 'گروه آموزشی',
            joinUrl: ref.joinUrl,
            status: ref.status,
            startsAt: ref.startsAt ? (ref.startsAt as Date).toISOString() : null,
          })
        }
      }
    }

    // 2. Event Meetino links from approved/attended registrations
    const eventRegistrations = await this.prisma.eventRegistration.findMany({
      where: {
        deletedAt: null,
        status: { in: ['APPROVED', 'ATTENDED'] },
        OR: [
          { userId: currentUser.id },
          ...(student ? [{ studentId: student.id }] : []),
        ],
      },
      select: {
        eventId: true,
        event: { select: { title: true } },
      },
    })

    const eventIds = eventRegistrations.map((r: any) => r.eventId)
    if (eventIds.length > 0) {
      const eventRefs = await this.prisma.meetinoMeetingReference.findMany({
        where: {
          sourceType: MeetinoMeetingSourceType.EVENT,
          sourceId: { in: eventIds },
          deletedAt: null,
        },
      })

      const eventNameMap = new Map<string, string>(
        eventRegistrations.map((r: any) => [r.eventId, r.event.title as string]),
      )

      for (const ref of eventRefs as any[]) {
        results.push({
          id: ref.id,
          title: ref.title,
          sourceType: ref.sourceType,
          sourceId: ref.sourceId,
          sourceLabel: eventNameMap.get(ref.sourceId) ?? 'رویداد',
          joinUrl: ref.joinUrl,
          status: ref.status,
          startsAt: ref.startsAt ? (ref.startsAt as Date).toISOString() : null,
        })
      }
    }

    // Sort: scheduled first, then by startsAt descending
    results.sort((a, b) => {
      if (a.startsAt && b.startsAt) {
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
      }
      return a.startsAt ? -1 : 1
    })

    return results
  }

  // ─── PATCH /portal/profile ─────────────────────────────────────────────────

  async updatePortalProfile(
    currentUser: CurrentUser,
    dto: UpdatePortalProfileDto,
  ): Promise<{ ok: boolean }> {
    // Email uniqueness check (if provided)
    if (dto.email !== undefined && dto.email !== null) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: currentUser.id }, deletedAt: null },
      })
      if (existing) throw new ConflictException('این ایمیل قبلاً ثبت شده است')
    }

    await this.prisma.$transaction(async (tx) => {
      // Update profile (firstName, lastName, city, avatarUrl)
      const profileData: Record<string, unknown> = {}
      if (dto.firstName !== undefined) profileData['firstName'] = dto.firstName
      if (dto.lastName !== undefined) profileData['lastName'] = dto.lastName
      if (dto.city !== undefined) profileData['city'] = dto.city
      if (dto.avatarUrl !== undefined) profileData['avatarUrl'] = dto.avatarUrl

      if (Object.keys(profileData).length > 0) {
        await tx.profile.upsert({
          where: { userId: currentUser.id },
          update: profileData,
          create: {
            userId: currentUser.id,
            firstName: (profileData['firstName'] as string) ?? '',
            lastName: (profileData['lastName'] as string) ?? '',
            city: (profileData['city'] as string | null) ?? null,
            avatarUrl: (profileData['avatarUrl'] as string | null) ?? null,
          },
        })
      }

      // Update user email if provided
      if (dto.email !== undefined) {
        await tx.user.update({
          where: { id: currentUser.id },
          data: { email: dto.email },
        })
      }
    })

    return { ok: true }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findStudentForUser(userId: string) {
    return this.prisma.student.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, studentCode: true, status: true, createdAt: true },
    })
  }

  private async findApplicantSummary(
    currentUser: CurrentUser,
  ): Promise<PortalApplicantSummaryDto | null> {
    // For self-registered users, the applicant was created with createdById = user.id
    // Also search by mobile as a fallback (for staff-created applicants who later got an account)
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { mobile: true },
    })
    if (!user) return null

    const applicant = await this.prisma.applicant.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { createdById: currentUser.id },
          { mobile: user.mobile },
        ],
      },
      include: {
        interestedCourse: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!applicant) return null

    return {
      id: applicant.id,
      status: applicant.status as ApplicantStatus,
      source: applicant.source as any,
      interestedTopic: applicant.interestedTopic,
      interestedCourseId: applicant.interestedCourseId,
      interestedCourseName: applicant.interestedCourse?.title ?? null,
      createdAt: applicant.createdAt.toISOString(),
      nextSteps: applicantNextSteps(applicant.status as ApplicantStatus),
    }
  }

  private async findStudentSummary(
    currentUser: CurrentUser,
  ): Promise<PortalStudentSummaryDto | null> {
    const student = await this.prisma.student.findFirst({
      where: { userId: currentUser.id, deletedAt: null },
      select: {
        id: true,
        studentCode: true,
        status: true,
        createdAt: true,
        enrollments: {
          where: { deletedAt: null, status: { in: ['PENDING', 'ACTIVE'] } },
          select: { id: true },
        },
      },
    })

    if (!student) return null

    return {
      id: student.id,
      studentCode: student.studentCode,
      status: student.status as any,
      activeEnrollmentsCount: student.enrollments.length,
      createdAt: student.createdAt.toISOString(),
    }
  }

  private computeAvailableSections(
    role: UserRole,
    studentSummary: PortalStudentSummaryDto | null,
  ): PortalSection[] {
    const sections: PortalSection[] = ['profile', 'notifications']

    if (role === UserRole.APPLICANT || role === UserRole.LEAD) {
      sections.push('applicant_status', 'events')
    }

    if (role === UserRole.STUDENT || studentSummary !== null) {
      sections.push('enrollments', 'payments', 'installments', 'events', 'meetino', 'skills', 'credits')
    }

    // Staff also have a portal but primarily use the admin hub
    if (STAFF_ROLES.includes(role)) {
      sections.push('events', 'meetino')
    }

    return [...new Set(sections)]
  }

  // ─── GET /portal/skills ────────────────────────────────────────────────────

  async getPortalSkills(currentUser: CurrentUser): Promise<PortalSkillDto[]> {
    const student = await this.findStudentForUser(currentUser.id)
    if (!student) return []

    const db = this.prisma as any

    const rows = await db.studentSkill.findMany({
      where: { studentId: student.id },
      orderBy: { awardedAt: 'desc' },
      include: {
        skill: { select: { title: true, category: true, level: true } },
      },
    })

    return rows.map((r: any) => ({
      id: r.id,
      skillId: r.skillId,
      title: r.skill?.title ?? '',
      category: r.skill?.category ?? null,
      skillLevel: r.skill?.level ?? null,
      level: r.level,
      awardedAt: (r.awardedAt as Date).toISOString(),
      // evidenceNote intentionally omitted — portal view never exposes internal notes
    }))
  }

  // ─── GET /portal/credits ───────────────────────────────────────────────────

  async getPortalCredits(currentUser: CurrentUser): Promise<PortalCreditDto[]> {
    const student = await this.findStudentForUser(currentUser.id)
    if (!student) return []

    const db = this.prisma as any

    const rows = await db.studentCredit.findMany({
      where: { studentId: student.id },
      orderBy: { awardedAt: 'desc' },
      include: {
        credit: { select: { title: true, type: true } },
      },
    })

    return rows.map((r: any) => ({
      id: r.id,
      creditId: r.creditId,
      title: r.credit?.title ?? '',
      creditType: r.credit?.type ?? null,
      status: r.status,
      awardedAt: (r.awardedAt as Date).toISOString(),
      expiresAt: r.expiresAt ? (r.expiresAt as Date).toISOString() : null,
      // evidenceNote intentionally omitted — portal view never exposes internal notes
    }))
  }
}
