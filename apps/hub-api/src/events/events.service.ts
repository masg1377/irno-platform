import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import {
  EventType,
  EventDeliveryMode,
  EventRegistrationMode,
  EventStatus,
  EventRegistrationStatus,
  EventRegistrationPaymentStatus,
  EventEligibilityRuleType,
  EventReminderType,
  EventReminderStatus,
  NotificationType,
  NotificationChannel,
  UserRole,
} from '@irno/types'
import type {
  EventDto,
  PaginatedEvents,
  EventRegistrationDto,
  PaginatedEventRegistrations,
  EventPaymentTransactionDto,
  EventEligibilityRuleDto,
  EventReminderDto,
  EventReportDto,
  EventsSummaryDto,
  CurrentUser,
} from '@irno/types'

import type { CreateEventDto } from './dto/create-event.dto'
import type { UpdateEventDto } from './dto/update-event.dto'
import type { UpdateEventStatusDto } from './dto/update-event-status.dto'
import type { CreateEventRegistrationDto } from './dto/create-event-registration.dto'
import type { UpdateEventRegistrationStatusDto } from './dto/update-event-registration-status.dto'
import type { RecordEventPaymentDto } from './dto/record-event-payment.dto'
import type { CreateEventEligibilityRuleDto } from './dto/create-event-eligibility-rule.dto'
import type { CheckEligibilityDto } from './dto/check-eligibility.dto'
import type { CreateEventReminderDto } from './dto/create-event-reminder.dto'
import type { SendEventAnnouncementDto } from './dto/send-event-announcement.dto'

/** Internal eligibility result shape used by events module only */
export interface EventEligibilityResult {
  eligible: boolean
  reasons: string[]
  requiresManualApproval: boolean
}

// Type-cast for Prisma delegates not yet in generated client
type AnyPrisma = Record<string, {
  findMany: (args: unknown) => Promise<unknown[]>
  findFirst: (args: unknown) => Promise<unknown | null>
  findUnique: (args: unknown) => Promise<unknown | null>
  create: (args: unknown) => Promise<unknown>
  update: (args: unknown) => Promise<unknown>
  delete: (args: unknown) => Promise<unknown>
  count: (args: unknown) => Promise<number>
  groupBy?: (args: unknown) => Promise<unknown[]>
}>

const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.TEACHER,
  UserRole.MENTOR,
]

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get db(): AnyPrisma {
    return this.prisma as unknown as AnyPrisma
  }

  // ─── Events CRUD ──────────────────────────────────────────

  async findAll(options: {
    type?: EventType
    deliveryMode?: EventDeliveryMode
    registrationMode?: EventRegistrationMode
    status?: EventStatus
    search?: string
    categoryId?: string
    fromDate?: string
    toDate?: string
    page?: number
    limit?: number
  }): Promise<PaginatedEvents> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { deletedAt: null }
    if (options.type) where['type'] = options.type
    if (options.deliveryMode) where['deliveryMode'] = options.deliveryMode
    if (options.registrationMode) where['registrationMode'] = options.registrationMode
    if (options.status) where['status'] = options.status
    if (options.categoryId) where['categoryId'] = options.categoryId
    if (options.search) where['title'] = { contains: options.search, mode: 'insensitive' }
    if (options.fromDate || options.toDate) {
      where['startsAt'] = {
        ...(options.fromDate ? { gte: new Date(options.fromDate) } : {}),
        ...(options.toDate ? { lte: new Date(options.toDate) } : {}),
      }
    }

    const [rows, total] = await Promise.all([
      this.db['event'].findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          _count: { select: { registrations: { where: { deletedAt: null } } } },
        },
      }),
      this.db['event'].count({ where }),
    ])

    return {
      data: (rows as Record<string, unknown>[]).map(this.mapEvent),
      total: total as number,
      page,
      limit,
    }
  }

  async findOne(id: string): Promise<EventDto> {
    const event = (await this.db['event'].findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { registrations: { where: { deletedAt: null } } } },
      },
    })) as Record<string, unknown> | null

    if (!event) throw new NotFoundException('رویداد یافت نشد')
    return this.mapEvent(event)
  }

  async create(dto: CreateEventDto, actor: CurrentUser): Promise<EventDto> {
    // Validate slug uniqueness
    const existing = await this.db['event'].findFirst({ where: { slug: dto.slug, deletedAt: null } })
    if (existing) throw new ConflictException('این slug قبلاً استفاده شده است')

    // Business rules
    if (dto.registrationMode === EventRegistrationMode.PAID && (dto.priceToman ?? 0) <= 0) {
      throw new BadRequestException('رویداد پولی باید قیمت بیشتر از صفر داشته باشد')
    }
    if (dto.registrationMode === EventRegistrationMode.FREE && (dto.priceToman ?? 0) > 0) {
      throw new BadRequestException('رویداد رایگان نمی‌تواند قیمت داشته باشد')
    }
    if (dto.deliveryMode === EventDeliveryMode.IN_PERSON && !dto.location) {
      throw new BadRequestException('رویداد حضوری نیاز به مکان برگزاری دارد')
    }

    const event = (await this.db['event'].create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        type: dto.type,
        deliveryMode: dto.deliveryMode,
        registrationMode: dto.registrationMode,
        status: dto.status ?? EventStatus.DRAFT,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        location: dto.location ?? null,
        onlineUrl: dto.onlineUrl ?? null,
        meetinoMeetingId: dto.meetinoMeetingId ?? null,
        meetinoJoinUrl: dto.meetinoJoinUrl ?? null,
        capacity: dto.capacity ?? null,
        priceToman: dto.priceToman,
        registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
        createdById: actor.id,
      },
      include: { _count: { select: { registrations: { where: { deletedAt: null } } } } },
    })) as Record<string, unknown>

    return this.mapEvent(event)
  }

  async update(id: string, dto: UpdateEventDto, _actor: CurrentUser): Promise<EventDto> {
    const event = await this.findOne(id)

    // If slug is changing, check uniqueness
    if (dto.slug && dto.slug !== event.slug) {
      const existing = await this.db['event'].findFirst({ where: { slug: dto.slug, deletedAt: null } })
      if (existing) throw new ConflictException('این slug قبلاً استفاده شده است')
    }

    const regMode = dto.registrationMode ?? event.registrationMode
    const price = dto.priceToman ?? event.priceToman

    if (regMode === EventRegistrationMode.PAID && price <= 0) {
      throw new BadRequestException('رویداد پولی باید قیمت بیشتر از صفر داشته باشد')
    }
    if (regMode === EventRegistrationMode.FREE && price > 0) {
      throw new BadRequestException('رویداد رایگان نمی‌تواند قیمت داشته باشد')
    }

    const updated = (await this.db['event'].update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.deliveryMode !== undefined ? { deliveryMode: dto.deliveryMode } : {}),
        ...(dto.registrationMode !== undefined ? { registrationMode: dto.registrationMode } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.onlineUrl !== undefined ? { onlineUrl: dto.onlineUrl } : {}),
        ...(dto.meetinoMeetingId !== undefined ? { meetinoMeetingId: dto.meetinoMeetingId } : {}),
        ...(dto.meetinoJoinUrl !== undefined ? { meetinoJoinUrl: dto.meetinoJoinUrl } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.priceToman !== undefined ? { priceToman: dto.priceToman } : {}),
        ...(dto.registrationDeadline !== undefined ? { registrationDeadline: new Date(dto.registrationDeadline) } : {}),
      },
      include: { _count: { select: { registrations: { where: { deletedAt: null } } } } },
    })) as Record<string, unknown>

    return this.mapEvent(updated)
  }

  async updateStatus(id: string, dto: UpdateEventStatusDto, actor: CurrentUser): Promise<EventDto> {
    await this.findOne(id) // throws if not found

    const updated = (await this.db['event'].update({
      where: { id },
      data: { status: dto.status },
      include: { _count: { select: { registrations: { where: { deletedAt: null } } } } },
    })) as Record<string, unknown>

    // If cancelled and notifyParticipants requested, notify all approved registrations
    if (dto.status === EventStatus.CANCELLED && dto.notifyParticipants) {
      await this.notifyRegistrants(id, {
        title: 'رویداد لغو شد',
        body: `رویداد «${String(updated['title'])}» لغو شده است.`,
        type: NotificationType.TRANSACTIONAL,
        channels: [NotificationChannel.IN_APP],
      })
    }

    return this.mapEvent(updated)
  }

  async remove(id: string, _actor: CurrentUser): Promise<void> {
    const event = await this.findOne(id)

    // If has active registrations, cancel instead of hard-delete
    const activeRegCount = await this.db['eventRegistration'].count({
      where: {
        eventId: id,
        deletedAt: null,
        status: { notIn: [EventRegistrationStatus.CANCELLED, EventRegistrationStatus.REJECTED] },
      },
    })

    if (activeRegCount > 0) {
      await this.db['event'].update({
        where: { id },
        data: { status: EventStatus.CANCELLED, deletedAt: new Date() },
      })
    } else {
      await this.db['event'].update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    }
    void event
  }

  // ─── Registrations ────────────────────────────────────────

  async listRegistrations(eventId: string, options: {
    status?: EventRegistrationStatus
    paymentStatus?: EventRegistrationPaymentStatus
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedEventRegistrations> {
    await this.findOne(eventId) // throws if not found

    const page = options.page ?? 1
    const limit = options.limit ?? 50
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { eventId, deletedAt: null }
    if (options.status) where['status'] = options.status
    if (options.paymentStatus) where['paymentStatus'] = options.paymentStatus
    if (options.search) {
      where['OR'] = [
        { fullName: { contains: options.search, mode: 'insensitive' } },
        { mobile: { contains: options.search } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.db['eventRegistration'].findMany({
        where,
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
      }),
      this.db['eventRegistration'].count({ where }),
    ])

    return {
      data: (rows as Record<string, unknown>[]).map(this.mapRegistration),
      total: total as number,
      page,
      limit,
    }
  }

  async getRegistration(eventId: string, registrationId: string): Promise<EventRegistrationDto> {
    const reg = (await this.db['eventRegistration'].findFirst({
      where: { id: registrationId, eventId, deletedAt: null },
    })) as Record<string, unknown> | null

    if (!reg) throw new NotFoundException('ثبت‌نام یافت نشد')
    return this.mapRegistration(reg)
  }

  async createRegistration(eventId: string, dto: CreateEventRegistrationDto, actor: CurrentUser): Promise<EventRegistrationDto> {
    const event = (await this.db['event'].findFirst({
      where: { id: eventId, deletedAt: null },
    })) as Record<string, unknown> | null

    if (!event) throw new NotFoundException('رویداد یافت نشد')

    // Check registration deadline
    const deadline = event['registrationDeadline'] as Date | null
    if (deadline && new Date() > deadline) {
      throw new BadRequestException('مهلت ثبت‌نام در این رویداد به پایان رسیده است')
    }

    // Check capacity
    if (event['capacity']) {
      const activeCount = await this.db['eventRegistration'].count({
        where: {
          eventId,
          deletedAt: null,
          status: { notIn: [EventRegistrationStatus.CANCELLED, EventRegistrationStatus.REJECTED] },
        },
      }) as number
      if (activeCount >= (event['capacity'] as number)) {
        // Put in waitlist
        return this.createRegistrationRecord(eventId, dto, event, actor, EventRegistrationStatus.WAITLISTED)
      }
    }

    // Check duplicate by mobile for same event
    const duplicate = await this.db['eventRegistration'].findFirst({
      where: {
        eventId,
        mobile: dto.mobile,
        deletedAt: null,
        status: { notIn: [EventRegistrationStatus.CANCELLED, EventRegistrationStatus.REJECTED] },
      },
    })
    if (duplicate) throw new ConflictException('این شماره موبایل قبلاً برای این رویداد ثبت‌نام کرده است')

    // Check eligibility
    const eligResult = await this.checkEligibilityInternal(eventId, dto.studentId, dto.applicantId, dto.userId)
    if (!eligResult.eligible && !eligResult.requiresManualApproval) {
      throw new ForbiddenException('شرایط ورود به این رویداد احراز نشد: ' + eligResult.reasons.join('. '))
    }

    const initialStatus = eligResult.requiresManualApproval
      ? EventRegistrationStatus.PENDING
      : EventRegistrationStatus.APPROVED

    return this.createRegistrationRecord(eventId, dto, event, actor, initialStatus)
  }

  private async createRegistrationRecord(
    eventId: string,
    dto: CreateEventRegistrationDto,
    event: Record<string, unknown>,
    actor: CurrentUser,
    status: EventRegistrationStatus,
  ): Promise<EventRegistrationDto> {
    const registrationMode = event['registrationMode'] as EventRegistrationMode
    const priceToman = event['priceToman'] as number

    const isPaid = registrationMode === EventRegistrationMode.PAID
    const paymentStatus = isPaid
      ? EventRegistrationPaymentStatus.UNPAID
      : EventRegistrationPaymentStatus.NOT_REQUIRED

    const reg = (await this.db['eventRegistration'].create({
      data: {
        eventId,
        userId: dto.userId ?? null,
        studentId: dto.studentId ?? null,
        applicantId: dto.applicantId ?? null,
        fullName: dto.fullName,
        mobile: dto.mobile,
        email: dto.email ?? null,
        status,
        paymentStatus,
        amountDueToman: isPaid ? priceToman : 0,
        paidAmountToman: 0,
        remainingAmountToman: isPaid ? priceToman : 0,
        notes: dto.notes ?? null,
        createdById: actor.id,
      },
    })) as Record<string, unknown>

    // Send in-app confirmation if user is linked
    if (dto.userId && status === EventRegistrationStatus.APPROVED) {
      await this.notificationsService.notifyUser({
        recipientUserId: dto.userId,
        title: 'ثبت‌نام رویداد تأیید شد',
        body: `ثبت‌نام شما در رویداد «${String(event['title'])}» با موفقیت انجام شد.`,
        type: NotificationType.TRANSACTIONAL,
        channels: [NotificationChannel.IN_APP],
        relatedEntityType: 'event',
        relatedEntityId: eventId,
      })
    }

    return this.mapRegistration(reg)
  }

  async updateRegistrationStatus(
    eventId: string,
    registrationId: string,
    dto: UpdateEventRegistrationStatusDto,
    _actor: CurrentUser,
  ): Promise<EventRegistrationDto> {
    const reg = await this.getRegistration(eventId, registrationId)

    const validTransitions: Record<EventRegistrationStatus, EventRegistrationStatus[]> = {
      [EventRegistrationStatus.PENDING]: [
        EventRegistrationStatus.APPROVED,
        EventRegistrationStatus.REJECTED,
        EventRegistrationStatus.WAITLISTED,
      ],
      [EventRegistrationStatus.APPROVED]: [
        EventRegistrationStatus.CANCELLED,
        EventRegistrationStatus.ATTENDED,
        EventRegistrationStatus.NO_SHOW,
      ],
      [EventRegistrationStatus.WAITLISTED]: [
        EventRegistrationStatus.APPROVED,
        EventRegistrationStatus.CANCELLED,
      ],
      [EventRegistrationStatus.ATTENDED]: [],
      [EventRegistrationStatus.NO_SHOW]: [],
      [EventRegistrationStatus.REJECTED]: [],
      [EventRegistrationStatus.CANCELLED]: [],
    }

    if (!validTransitions[reg.status]?.includes(dto.status)) {
      throw new BadRequestException(`تغییر وضعیت از ${reg.status} به ${dto.status} مجاز نیست`)
    }

    const data: Record<string, unknown> = { status: dto.status }
    if (dto.status === EventRegistrationStatus.CANCELLED) {
      data['cancelledAt'] = new Date()
    }
    if (dto.status === EventRegistrationStatus.ATTENDED) {
      data['checkedInAt'] = new Date()
    }

    const updated = (await this.db['eventRegistration'].update({
      where: { id: registrationId },
      data,
    })) as Record<string, unknown>

    return this.mapRegistration(updated)
  }

  async checkIn(eventId: string, registrationId: string, _actor: CurrentUser): Promise<EventRegistrationDto> {
    const reg = await this.getRegistration(eventId, registrationId)

    if (reg.status === EventRegistrationStatus.ATTENDED) {
      return reg // idempotent
    }
    if (
      reg.status !== EventRegistrationStatus.APPROVED &&
      reg.status !== EventRegistrationStatus.PENDING
    ) {
      throw new BadRequestException('این ثبت‌نام در وضعیت مناسب برای ثبت حضور نیست')
    }

    const updated = (await this.db['eventRegistration'].update({
      where: { id: registrationId },
      data: {
        status: EventRegistrationStatus.ATTENDED,
        checkedInAt: new Date(),
      },
    })) as Record<string, unknown>

    return this.mapRegistration(updated)
  }

  // ─── Event Payments ───────────────────────────────────────

  async listPayments(eventId: string, registrationId: string): Promise<EventPaymentTransactionDto[]> {
    await this.getRegistration(eventId, registrationId)

    const rows = (await this.db['eventPaymentTransaction'].findMany({
      where: { eventRegistrationId: registrationId },
      orderBy: { paidAt: 'desc' },
    })) as Record<string, unknown>[]

    return rows.map(this.mapPaymentTx)
  }

  async recordPayment(
    eventId: string,
    registrationId: string,
    dto: RecordEventPaymentDto,
    actor: CurrentUser,
  ): Promise<EventPaymentTransactionDto> {
    const reg = (await this.db['eventRegistration'].findFirst({
      where: { id: registrationId, eventId, deletedAt: null },
    })) as Record<string, unknown> | null

    if (!reg) throw new NotFoundException('ثبت‌نام یافت نشد')

    if (reg['paymentStatus'] === EventRegistrationPaymentStatus.NOT_REQUIRED) {
      throw new BadRequestException('این رویداد رایگان است و نیاز به ثبت پرداخت ندارد')
    }

    const remaining = reg['remainingAmountToman'] as number
    if (dto.amountToman > remaining) {
      throw new BadRequestException(`مبلغ بیشتر از مانده پرداختی است. مانده: ${remaining} تومان`)
    }

    const tx = (await this.db['eventPaymentTransaction'].create({
      data: {
        eventRegistrationId: registrationId,
        amountToman: dto.amountToman,
        method: dto.method,
        paidAt: new Date(dto.paidAt),
        receiptNote: dto.receiptNote ?? null,
        recordedById: actor.id,
      },
    })) as Record<string, unknown>

    // Update registration payment fields
    const newPaid = (reg['paidAmountToman'] as number) + dto.amountToman
    const newRemaining = (reg['amountDueToman'] as number) - newPaid
    const newPaymentStatus = newRemaining <= 0
      ? EventRegistrationPaymentStatus.PAID
      : EventRegistrationPaymentStatus.PARTIALLY_PAID

    await this.db['eventRegistration'].update({
      where: { id: registrationId },
      data: {
        paidAmountToman: newPaid,
        remainingAmountToman: Math.max(0, newRemaining),
        paymentStatus: newPaymentStatus,
      },
    })

    return this.mapPaymentTx(tx)
  }

  // ─── Eligibility Rules ────────────────────────────────────

  async listEligibilityRules(eventId: string): Promise<EventEligibilityRuleDto[]> {
    await this.findOne(eventId)

    const rows = (await this.db['eventEligibilityRule'].findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    })) as Record<string, unknown>[]

    return rows.map(this.mapEligibilityRule)
  }

  async createEligibilityRule(eventId: string, dto: CreateEventEligibilityRuleDto, _actor: CurrentUser): Promise<EventEligibilityRuleDto> {
    await this.findOne(eventId)

    const rule = (await this.db['eventEligibilityRule'].create({
      data: {
        eventId,
        type: dto.type,
        operator: dto.operator ?? null,
        value: dto.value ?? null,
        isRequired: dto.isRequired ?? true,
      },
    })) as Record<string, unknown>

    return this.mapEligibilityRule(rule)
  }

  async deleteEligibilityRule(eventId: string, ruleId: string, _actor: CurrentUser): Promise<void> {
    await this.findOne(eventId)

    const rule = await this.db['eventEligibilityRule'].findFirst({
      where: { id: ruleId, eventId },
    })
    if (!rule) throw new NotFoundException('قانون واجد شرایط بودن یافت نشد')

    await this.db['eventEligibilityRule'].delete({ where: { id: ruleId } })
  }

  async checkEligibility(eventId: string, dto: CheckEligibilityDto): Promise<EventEligibilityResult> {
    await this.findOne(eventId)
    return this.checkEligibilityInternal(eventId, dto.studentId, dto.applicantId, dto.userId)
  }

  private async checkEligibilityInternal(
    eventId: string,
    studentId?: string,
    _applicantId?: string,
    userId?: string,
  ): Promise<EventEligibilityResult> {
    const rules = (await this.db['eventEligibilityRule'].findMany({
      where: { eventId, isRequired: true },
    })) as Record<string, unknown>[]

    if (rules.length === 0) {
      return { eligible: true, reasons: [], requiresManualApproval: false }
    }

    const reasons: string[] = []
    let requiresManualApproval = false
    let eligible = true

    for (const rule of rules) {
      const ruleType = rule['type'] as EventEligibilityRuleType
      const ruleValue = rule['value'] as Record<string, unknown> | null

      switch (ruleType) {
        case EventEligibilityRuleType.PUBLIC:
          // always pass
          break

        case EventEligibilityRuleType.MANUAL_APPROVAL_REQUIRED:
          requiresManualApproval = true
          break

        case EventEligibilityRuleType.SKILL_OR_CREDIT_PLACEHOLDER:
          // Not enforced yet — treat as manual approval
          requiresManualApproval = true
          break

        case EventEligibilityRuleType.ACTIVE_STUDENT_ONLY: {
          if (!studentId) {
            eligible = false
            reasons.push('باید دانشجوی فعال باشید')
          } else {
            const student = await this.prisma.student.findFirst({
              where: { id: studentId, status: 'ACTIVE', deletedAt: null },
            })
            if (!student) {
              eligible = false
              reasons.push('باید دانشجوی فعال باشید')
            }
          }
          break
        }

        case EventEligibilityRuleType.STAFF_ONLY: {
          if (!userId) {
            eligible = false
            reasons.push('فقط کارکنان ایرنو می‌توانند ثبت‌نام کنند')
          } else {
            const user = await this.prisma.user.findFirst({
              where: { id: userId, role: { in: STAFF_ROLES }, deletedAt: null },
            })
            if (!user) {
              eligible = false
              reasons.push('فقط کارکنان ایرنو می‌توانند ثبت‌نام کنند')
            }
          }
          break
        }

        case EventEligibilityRuleType.SPECIFIC_COURSE: {
          const courseId = ruleValue?.['courseId'] as string | undefined
          if (!studentId || !courseId) {
            eligible = false
            reasons.push('باید در دوره مشخص‌شده ثبت‌نام کرده باشید')
          } else {
            const enrollment = await this.prisma.enrollment.findFirst({
              where: {
                studentId,
                courseId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
                deletedAt: null,
              },
            })
            if (!enrollment) {
              eligible = false
              reasons.push('باید در دوره مشخص‌شده ثبت‌نام کرده باشید')
            }
          }
          break
        }

        case EventEligibilityRuleType.SPECIFIC_COURSE_GROUP: {
          const courseGroupId = ruleValue?.['courseGroupId'] as string | undefined
          if (!studentId || !courseGroupId) {
            eligible = false
            reasons.push('باید در گروه مشخص‌شده ثبت‌نام کرده باشید')
          } else {
            const enrollment = await this.prisma.enrollment.findFirst({
              where: {
                studentId,
                courseGroupId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
                deletedAt: null,
              },
            })
            if (!enrollment) {
              eligible = false
              reasons.push('باید در گروه مشخص‌شده ثبت‌نام کرده باشید')
            }
          }
          break
        }

        case EventEligibilityRuleType.COMPLETED_COURSE: {
          const courseId = ruleValue?.['courseId'] as string | undefined
          if (!studentId || !courseId) {
            eligible = false
            reasons.push('باید دوره مشخص‌شده را تکمیل کرده باشید')
          } else {
            const enrollment = await this.prisma.enrollment.findFirst({
              where: { studentId, courseId, status: 'COMPLETED', deletedAt: null },
            })
            if (!enrollment) {
              eligible = false
              reasons.push('باید دوره مشخص‌شده را تکمیل کرده باشید')
            }
          }
          break
        }

        case EventEligibilityRuleType.NO_OVERDUE_PAYMENTS: {
          if (studentId) {
            const now = new Date()
            const overdueCount = await this.prisma.installment.count({
              where: { studentId, status: 'PENDING', dueDate: { lt: now } },
            })
            if (overdueCount > 0) {
              eligible = false
              reasons.push('قسط معوق دارید')
            }
          }
          break
        }

        default:
          // unknown rule type — skip
          break
      }
    }

    return { eligible, reasons, requiresManualApproval }
  }

  // ─── Reminders ────────────────────────────────────────────

  async listReminders(eventId: string): Promise<EventReminderDto[]> {
    await this.findOne(eventId)

    const rows = (await this.db['eventReminder'].findMany({
      where: { eventId },
      orderBy: { scheduledAt: 'asc' },
    })) as Record<string, unknown>[]

    return rows.map(this.mapReminder)
  }

  async createReminder(eventId: string, dto: CreateEventReminderDto, _actor: CurrentUser): Promise<EventReminderDto> {
    await this.findOne(eventId)

    const reminder = (await this.db['eventReminder'].create({
      data: {
        eventId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        channel: dto.channel,
        status: EventReminderStatus.PENDING,
        notificationTemplateId: dto.notificationTemplateId ?? null,
      },
    })) as Record<string, unknown>

    return this.mapReminder(reminder)
  }

  async sendAnnouncement(eventId: string, dto: SendEventAnnouncementDto, _actor: CurrentUser): Promise<{ sent: number }> {
    await this.findOne(eventId)

    // Collect all user IDs from APPROVED registrations that have a userId
    const registrations = (await this.db['eventRegistration'].findMany({
      where: {
        eventId,
        deletedAt: null,
        status: { in: [EventRegistrationStatus.APPROVED, EventRegistrationStatus.ATTENDED] },
        userId: { not: null },
      },
      select: { userId: true },
    })) as { userId: string }[]

    const userIds = [...new Set(registrations.map((r) => r.userId).filter(Boolean))]

    await this.notificationsService.notifyUsers(userIds, {
      title: dto.title,
      body: dto.body,
      type: NotificationType.TRANSACTIONAL,
      channels: dto.channels,
      relatedEntityType: 'event',
      relatedEntityId: eventId,
    })

    return { sent: userIds.length }
  }

  // ─── Reports ──────────────────────────────────────────────

  async getEventReport(eventId: string): Promise<EventReportDto> {
    await this.findOne(eventId)

    const registrations = (await this.db['eventRegistration'].findMany({
      where: { eventId, deletedAt: null },
      select: {
        status: true,
        paymentStatus: true,
        amountDueToman: true,
        paidAmountToman: true,
        remainingAmountToman: true,
      },
    })) as Record<string, unknown>[]

    const total = registrations.length
    const approvedCount = registrations.filter(
      (r) => r['status'] === EventRegistrationStatus.APPROVED,
    ).length
    const waitlistedCount = registrations.filter(
      (r) => r['status'] === EventRegistrationStatus.WAITLISTED,
    ).length
    const attendedCount = registrations.filter(
      (r) => r['status'] === EventRegistrationStatus.ATTENDED,
    ).length
    const noShowCount = registrations.filter(
      (r) => r['status'] === EventRegistrationStatus.NO_SHOW,
    ).length
    const paidCount = registrations.filter(
      (r) => r['paymentStatus'] === EventRegistrationPaymentStatus.PAID,
    ).length
    const unpaidCount = registrations.filter(
      (r) => r['paymentStatus'] === EventRegistrationPaymentStatus.UNPAID,
    ).length
    const totalExpectedRevenueToman = registrations.reduce(
      (sum, r) => sum + (r['amountDueToman'] as number),
      0,
    )
    const totalPaidToman = registrations.reduce(
      (sum, r) => sum + (r['paidAmountToman'] as number),
      0,
    )
    const remainingToman = registrations.reduce(
      (sum, r) => sum + (r['remainingAmountToman'] as number),
      0,
    )

    return {
      eventId,
      totalRegistrations: total,
      approvedCount,
      waitlistedCount,
      attendedCount,
      noShowCount,
      paidCount,
      unpaidCount,
      totalExpectedRevenueToman,
      totalPaidToman,
      remainingToman,
    }
  }

  async getEventsSummary(): Promise<EventsSummaryDto> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalEvents, upcomingEvents, liveEvents, completedEvents, paidEvents, freeEvents] =
      await Promise.all([
        this.db['event'].count({ where: { deletedAt: null } }) as Promise<number>,
        this.db['event'].count({
          where: { deletedAt: null, startsAt: { gte: now }, status: { not: EventStatus.CANCELLED } },
        }) as Promise<number>,
        this.db['event'].count({
          where: { deletedAt: null, status: EventStatus.LIVE },
        }) as Promise<number>,
        this.db['event'].count({
          where: { deletedAt: null, status: EventStatus.COMPLETED },
        }) as Promise<number>,
        this.db['event'].count({
          where: { deletedAt: null, registrationMode: EventRegistrationMode.PAID },
        }) as Promise<number>,
        this.db['event'].count({
          where: { deletedAt: null, registrationMode: EventRegistrationMode.FREE },
        }) as Promise<number>,
      ])

    const registrationsThisMonth = await this.db['eventRegistration'].count({
      where: { deletedAt: null, registeredAt: { gte: startOfMonth } },
    }) as number

    // Revenue from paid registrations this month
    const paidTxRows = (await this.db['eventPaymentTransaction'].findMany({
      where: { paidAt: { gte: startOfMonth } },
      select: { amountToman: true },
    })) as { amountToman: number }[]

    const eventRevenueToman = paidTxRows.reduce((sum, tx) => sum + tx.amountToman, 0)

    return {
      totalEvents: totalEvents as number,
      upcomingEvents: upcomingEvents as number,
      liveEvents: liveEvents as number,
      completedEvents: completedEvents as number,
      paidEvents: paidEvents as number,
      freeEvents: freeEvents as number,
      registrationsThisMonth: registrationsThisMonth as number,
      eventRevenueToman,
    }
  }

  // ─── Private helpers ──────────────────────────────────────

  private async notifyRegistrants(
    eventId: string,
    payload: { title: string; body: string; type: NotificationType; channels: NotificationChannel[] },
  ): Promise<void> {
    const registrations = (await this.db['eventRegistration'].findMany({
      where: {
        eventId,
        deletedAt: null,
        status: { notIn: [EventRegistrationStatus.CANCELLED, EventRegistrationStatus.REJECTED] },
        userId: { not: null },
      },
      select: { userId: true },
    })) as { userId: string }[]

    const userIds = registrations.map((r) => r.userId).filter(Boolean)
    await this.notificationsService.notifyUsers(userIds, {
      ...payload,
      relatedEntityType: 'event',
      relatedEntityId: eventId,
    })
  }

  // ─── Mappers ──────────────────────────────────────────────

  private mapEvent(row: Record<string, unknown>): EventDto {
    const counts = row['_count'] as Record<string, number> | undefined
    return {
      id: String(row['id']),
      title: String(row['title']),
      slug: String(row['slug']),
      description: (row['description'] as string | null) ?? null,
      type: row['type'] as EventType,
      deliveryMode: row['deliveryMode'] as EventDeliveryMode,
      registrationMode: row['registrationMode'] as EventRegistrationMode,
      status: row['status'] as EventStatus,
      startsAt: String(row['startsAt']),
      endsAt: row['endsAt'] ? String(row['endsAt']) : null,
      location: (row['location'] as string | null) ?? null,
      onlineUrl: (row['onlineUrl'] as string | null) ?? null,
      meetinoMeetingId: (row['meetinoMeetingId'] as string | null) ?? null,
      meetinoJoinUrl: (row['meetinoJoinUrl'] as string | null) ?? null,
      capacity: (row['capacity'] as number | null) ?? null,
      priceToman: (row['priceToman'] as number) ?? 0,
      registrationDeadline: row['registrationDeadline'] ? String(row['registrationDeadline']) : null,
      createdById: String(row['createdById']),
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
      registrationCount: counts?.['registrations'] ?? 0,
      approvedCount: 0,
      attendedCount: 0,
    }
  }

  private mapRegistration(row: Record<string, unknown>): EventRegistrationDto {
    return {
      id: String(row['id']),
      eventId: String(row['eventId']),
      userId: (row['userId'] as string | null) ?? null,
      studentId: (row['studentId'] as string | null) ?? null,
      applicantId: (row['applicantId'] as string | null) ?? null,
      fullName: String(row['fullName']),
      mobile: String(row['mobile']),
      email: (row['email'] as string | null) ?? null,
      status: row['status'] as EventRegistrationStatus,
      paymentStatus: row['paymentStatus'] as EventRegistrationPaymentStatus,
      amountDueToman: (row['amountDueToman'] as number) ?? 0,
      paidAmountToman: (row['paidAmountToman'] as number) ?? 0,
      remainingAmountToman: (row['remainingAmountToman'] as number) ?? 0,
      registeredAt: String(row['registeredAt']),
      checkedInAt: row['checkedInAt'] ? String(row['checkedInAt']) : null,
      cancelledAt: row['cancelledAt'] ? String(row['cancelledAt']) : null,
      notes: (row['notes'] as string | null) ?? null,
      createdById: (row['createdById'] as string | null) ?? null,
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
    }
  }

  private mapPaymentTx(row: Record<string, unknown>): EventPaymentTransactionDto {
    return {
      id: String(row['id']),
      eventRegistrationId: String(row['eventRegistrationId']),
      amountToman: row['amountToman'] as number,
      method: row['method'] as import('@irno/types').PaymentMethod,
      paidAt: String(row['paidAt']),
      receiptNote: (row['receiptNote'] as string | null) ?? null,
      recordedById: String(row['recordedById']),
      createdAt: String(row['createdAt']),
    }
  }

  private mapEligibilityRule(row: Record<string, unknown>): EventEligibilityRuleDto {
    return {
      id: String(row['id']),
      eventId: String(row['eventId']),
      type: row['type'] as EventEligibilityRuleType,
      operator: (row['operator'] as string | null) ?? null,
      value: (row['value'] as Record<string, unknown> | null) ?? null,
      isRequired: Boolean(row['isRequired']),
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
    }
  }

  private mapReminder(row: Record<string, unknown>): EventReminderDto {
    return {
      id: String(row['id']),
      eventId: String(row['eventId']),
      type: row['type'] as EventReminderType,
      scheduledAt: String(row['scheduledAt']),
      channel: row['channel'] as NotificationChannel,
      status: row['status'] as EventReminderStatus,
      notificationTemplateId: (row['notificationTemplateId'] as string | null) ?? null,
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
    }
  }
}
