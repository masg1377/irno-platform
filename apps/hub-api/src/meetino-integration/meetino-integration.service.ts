import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MeetinoClientService } from './meetino-client.service'
import { NotificationsService } from '../notifications/notifications.service'
import {
  MeetinoMeetingSourceType,
  MeetinoMeetingStatus,
  MeetinoParticipantType,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  TimelineEventType,
} from '@irno/types'
import type {
  MeetinoMeetingReferenceDto,
  MeetinoAttendanceRecordDto,
  MeetinoIntegrationStatusDto,
  MeetinoSyncResultDto,
} from '@irno/types'
import type { AttachMeetinoMeetingDto } from './dto/attach-meeting.dto'
import type { UpdateMeetinoReferenceDto } from './dto/update-reference.dto'

/**
 * Escape hatch for Prisma delegates not yet in the generated client.
 * Run `pnpm db:generate` after migration on production machine.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = Record<string, any>

@Injectable()
export class MeetinoIntegrationService {
  private readonly logger = new Logger(MeetinoIntegrationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MeetinoClientService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Escape hatch — delegates not in Prisma client until `pnpm db:generate` is run. */
  private get db(): AnyPrisma {
    return this.prisma as unknown as AnyPrisma
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getIntegrationStatus(): MeetinoIntegrationStatusDto {
    return {
      enabled: !!this.client['enabled'],
      webUrlConfigured: this.client.isWebConfigured(),
      apiUrlConfigured: !!this.client['apiUrl'],
      apiKeyConfigured: !!this.client['apiKey'],
      lastCheck: null,
      connectionOk: null,
    }
  }

  async testConnection() {
    return this.client.testConnection()
  }

  // ── CourseGroup Meetino reference ────────────────────────────────────────

  async attachForCourseGroup(
    groupId: string,
    dto: AttachMeetinoMeetingDto,
    actorId: string,
  ): Promise<MeetinoMeetingReferenceDto> {
    // Verify group exists
    const group = await this.db.courseGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      include: { course: true },
    })
    if (!group) throw new NotFoundException('گروه یافت نشد')

    // Check for existing active reference
    const existing = await this.db.meetinoMeetingReference.findFirst({
      where: {
        sourceType: MeetinoMeetingSourceType.COURSE_GROUP,
        sourceId: groupId,
        deletedAt: null,
        status: { notIn: [MeetinoMeetingStatus.CANCELLED, MeetinoMeetingStatus.ENDED] },
      },
    })
    if (existing) {
      throw new ConflictException(
        'این گروه از قبل جلسه فعال میتینو دارد. ابتدا جلسه قبلی را لغو کنید.',
      )
    }

    const title = dto.title ?? `${group.course.title} — ${group.name}`
    let joinUrl = dto.manualJoinUrl
    let meetinoMeetingId: string | undefined
    let meetinoSlug: string | undefined
    let status = MeetinoMeetingStatus.DRAFT

    if (dto.createInMeetino) {
      const result = await this.client.createMeeting({ title, startsAt: dto.startsAt })
      if (result) {
        meetinoMeetingId = result.id
        meetinoSlug = result.slug
        joinUrl = result.joinUrl
        status = MeetinoMeetingStatus.SCHEDULED
      } else if (!joinUrl) {
        throw new BadRequestException(
          'ایجاد جلسه در میتینو ممکن نشد. اتصال را بررسی کنید یا از لینک دستی استفاده کنید.',
        )
      }
    }

    if (!joinUrl) {
      throw new BadRequestException('لینک ورود الزامی است. یا ایجاد خودکار را فعال کنید یا لینک دستی وارد کنید.')
    }

    const ref = await this.db.meetinoMeetingReference.create({
      data: {
        sourceType: MeetinoMeetingSourceType.COURSE_GROUP,
        sourceId: groupId,
        meetinoMeetingId: meetinoMeetingId ?? null,
        meetinoSlug: meetinoSlug ?? null,
        title,
        joinUrl,
        status,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        createdById: actorId,
      },
    })

    this.logger.log(`Meetino reference created for group=${groupId}, slug=${meetinoSlug ?? 'manual'}`)

    // Notify teacher if assigned
    await this.notifyGroupTeacher(group, title, joinUrl)

    return this.toReferenceDto(ref)
  }

  async getForCourseGroup(groupId: string): Promise<MeetinoMeetingReferenceDto | null> {
    const ref = await this.db.meetinoMeetingReference.findFirst({
      where: {
        sourceType: MeetinoMeetingSourceType.COURSE_GROUP,
        sourceId: groupId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ref ? this.toReferenceDto(ref) : null
  }

  async updateForCourseGroup(
    groupId: string,
    dto: UpdateMeetinoReferenceDto,
  ): Promise<MeetinoMeetingReferenceDto> {
    const ref = await this.db.meetinoMeetingReference.findFirst({
      where: { sourceType: MeetinoMeetingSourceType.COURSE_GROUP, sourceId: groupId, deletedAt: null },
    })
    if (!ref) throw new NotFoundException('جلسه میتینو برای این گروه یافت نشد')

    const updated = await this.db.meetinoMeetingReference.update({
      where: { id: ref.id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.joinUrl && { joinUrl: dto.joinUrl }),
        ...(dto.status && { status: dto.status as MeetinoMeetingStatus }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt && { endsAt: new Date(dto.endsAt) }),
      },
    })
    return this.toReferenceDto(updated)
  }

  async syncForCourseGroup(groupId: string, actorId: string): Promise<MeetinoSyncResultDto> {
    const ref = await this.db.meetinoMeetingReference.findFirst({
      where: { sourceType: MeetinoMeetingSourceType.COURSE_GROUP, sourceId: groupId, deletedAt: null },
    })
    if (!ref) throw new NotFoundException('جلسه میتینو برای این گروه یافت نشد')
    if (!ref.meetinoSlug) {
      return {
        synced: false,
        message: 'این جلسه به صورت دستی ثبت شده و شناسه میتینو ندارد. همگام‌سازی امکان‌پذیر نیست.',
        attendanceCount: 0,
        lastSyncedAt: null,
      }
    }
    return this.syncAttendance(ref.id, ref.meetinoSlug, actorId, MeetinoMeetingSourceType.COURSE_GROUP, groupId)
  }

  // ── Event Meetino reference ──────────────────────────────────────────────

  async attachForEvent(
    eventId: string,
    dto: AttachMeetinoMeetingDto,
    actorId: string,
  ): Promise<MeetinoMeetingReferenceDto> {
    const event = await this.db.event.findFirst({
      where: { id: eventId, deletedAt: null },
    })
    if (!event) throw new NotFoundException('رویداد یافت نشد')

    if (event.deliveryMode === 'IN_PERSON') {
      throw new BadRequestException('جلسه میتینو فقط برای رویدادهای آنلاین یا ترکیبی قابل تنظیم است')
    }

    const existing = await this.db.meetinoMeetingReference.findFirst({
      where: {
        sourceType: MeetinoMeetingSourceType.EVENT,
        sourceId: eventId,
        deletedAt: null,
        status: { notIn: [MeetinoMeetingStatus.CANCELLED, MeetinoMeetingStatus.ENDED] },
      },
    })
    if (existing) {
      throw new ConflictException(
        'این رویداد از قبل جلسه فعال میتینو دارد.',
      )
    }

    const title = dto.title ?? event.title
    let joinUrl = dto.manualJoinUrl
    let meetinoMeetingId: string | undefined
    let meetinoSlug: string | undefined
    let status = MeetinoMeetingStatus.DRAFT

    if (dto.createInMeetino) {
      const result = await this.client.createMeeting({ title, startsAt: dto.startsAt ?? event.startsAt.toISOString() })
      if (result) {
        meetinoMeetingId = result.id
        meetinoSlug = result.slug
        joinUrl = result.joinUrl
        status = MeetinoMeetingStatus.SCHEDULED
      } else if (!joinUrl) {
        throw new BadRequestException(
          'ایجاد جلسه در میتینو ممکن نشد. از لینک دستی استفاده کنید.',
        )
      }
    }

    if (!joinUrl) {
      throw new BadRequestException('لینک ورود الزامی است.')
    }

    const ref = await this.db.meetinoMeetingReference.create({
      data: {
        sourceType: MeetinoMeetingSourceType.EVENT,
        sourceId: eventId,
        meetinoMeetingId: meetinoMeetingId ?? null,
        meetinoSlug: meetinoSlug ?? null,
        title,
        joinUrl,
        status,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : event.startsAt,
        createdById: actorId,
      },
    })

    // Update event.meetinoJoinUrl for quick access
    await this.db.event.update({
      where: { id: eventId },
      data: { meetinoJoinUrl: joinUrl, meetinoMeetingId: meetinoMeetingId ?? null },
    })

    this.logger.log(`Meetino reference created for event=${eventId}, slug=${meetinoSlug ?? 'manual'}`)
    return this.toReferenceDto(ref)
  }

  async getForEvent(eventId: string): Promise<MeetinoMeetingReferenceDto | null> {
    const ref = await this.db.meetinoMeetingReference.findFirst({
      where: {
        sourceType: MeetinoMeetingSourceType.EVENT,
        sourceId: eventId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ref ? this.toReferenceDto(ref) : null
  }

  async syncForEvent(eventId: string, actorId: string): Promise<MeetinoSyncResultDto> {
    const ref = await this.db.meetinoMeetingReference.findFirst({
      where: { sourceType: MeetinoMeetingSourceType.EVENT, sourceId: eventId, deletedAt: null },
    })
    if (!ref) throw new NotFoundException('جلسه میتینو برای این رویداد یافت نشد')
    if (!ref.meetinoSlug) {
      return {
        synced: false,
        message: 'این جلسه به صورت دستی ثبت شده. همگام‌سازی امکان‌پذیر نیست.',
        attendanceCount: 0,
        lastSyncedAt: null,
      }
    }
    return this.syncAttendance(ref.id, ref.meetinoSlug, actorId, MeetinoMeetingSourceType.EVENT, eventId)
  }

  // ── Attendance Records ────────────────────────────────────────────────────

  async getAttendanceRecords(referenceId: string): Promise<MeetinoAttendanceRecordDto[]> {
    const records = await this.db.meetinoAttendanceRecord.findMany({
      where: { referenceId },
      orderBy: { joinedAt: 'asc' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return records.map((r: any) => this.toAttendanceDto(r))
  }

  // ── Internal: attendance sync ─────────────────────────────────────────────

  private async syncAttendance(
    referenceId: string,
    slug: string,
    _actorId: string,
    sourceType: MeetinoMeetingSourceType,
    sourceId: string,
  ): Promise<MeetinoSyncResultDto> {
    if (!this.client.isConfigured()) {
      return {
        synced: false,
        message:
          'API میتینو پیکربندی نشده است. MEETINO_API_URL و MEETINO_API_KEY را تنظیم کنید تا همگام‌سازی فعال شود.',
        attendanceCount: 0,
        lastSyncedAt: null,
      }
    }

    const report = await this.client.getMeetingReport(slug)
    if (!report) {
      return {
        synced: false,
        message: 'دریافت گزارش از میتینو ممکن نشد. API key باید متعلق به host جلسه باشد.',
        attendanceCount: 0,
        lastSyncedAt: null,
      }
    }

    // Upsert attendance records
    let count = 0
    for (const p of report.participants) {
      // Try to match a student by userId if available
      let studentId: string | null = null
      if (p.userId) {
        const student = await this.db.student.findFirst({
          where: { user: { id: p.userId }, deletedAt: null },
          select: { id: true },
        })
        studentId = student?.id ?? null
      }

      await this.db.meetinoAttendanceRecord.upsert({
        where: {
          // Use composite-like upsert: find by referenceId + meetinoParticipantId if present
          // Since Prisma requires a unique field for upsert, we do findFirst + create/update manually
          id: (await this.db.meetinoAttendanceRecord.findFirst({
            where: { referenceId, meetinoParticipantId: p.id || null },
            select: { id: true },
          }))?.id ?? 'new-' + Math.random(),
        },
        update: {
          displayName: p.displayName,
          joinedAt: p.joinedAt ? new Date(p.joinedAt) : null,
          leftAt: p.leftAt ? new Date(p.leftAt) : null,
          durationSeconds: p.durationSeconds ?? null,
          wasGuest: p.wasGuest,
          rawData: p as unknown as Record<string, unknown>,
        },
        create: {
          referenceId,
          meetinoParticipantId: p.id || null,
          userId: p.userId ?? null,
          studentId,
          displayName: p.displayName,
          participantType: p.wasGuest ? MeetinoParticipantType.GUEST : MeetinoParticipantType.REGISTERED,
          joinedAt: p.joinedAt ? new Date(p.joinedAt) : null,
          leftAt: p.leftAt ? new Date(p.leftAt) : null,
          durationSeconds: p.durationSeconds ?? null,
          wasGuest: p.wasGuest,
          rawData: p as unknown as Record<string, unknown>,
        },
      })

      // Write student timeline event if matched
      if (studentId) {
        const ref = await this.db.meetinoMeetingReference.findUnique({ where: { id: referenceId } })
        const existingTimeline = await this.db.studentTimelineEvent.findFirst({
          where: {
            studentId,
            eventType: TimelineEventType.MEETINO_SESSION_ATTENDED,
            metadata: { path: ['referenceId'], equals: referenceId },
          },
        })
        if (!existingTimeline && ref) {
          await this.db.studentTimelineEvent.create({
            data: {
              studentId,
              eventType: TimelineEventType.MEETINO_SESSION_ATTENDED,
              title: `حضور در جلسه: ${ref.title}`,
              metadata: {
                referenceId,
                sourceType,
                sourceId,
                meetingTitle: ref.title,
                joinedAt: p.joinedAt,
                leftAt: p.leftAt,
                durationSeconds: p.durationSeconds,
              },
            },
          })
        }
      }

      count++
    }

    const now = new Date()
    await this.db.meetinoMeetingReference.update({
      where: { id: referenceId },
      data: { lastSyncedAt: now, status: MeetinoMeetingStatus.ENDED },
    })

    this.logger.log(`Meetino sync complete for reference=${referenceId}: ${count} participants`)

    return {
      synced: true,
      message: `همگام‌سازی با موفقیت انجام شد. ${count} شرکت‌کننده ثبت شد.`,
      attendanceCount: count,
      lastSyncedAt: now.toISOString(),
    }
  }

  // ── Notification helpers ──────────────────────────────────────────────────

  private async notifyGroupTeacher(
    group: { teacherId?: string | null; name: string },
    meetingTitle: string,
    joinUrl: string,
  ): Promise<void> {
    if (!group.teacherId) return
    try {
      await this.notifications.notifyUser({
        recipientUserId: group.teacherId,
        title: 'جلسه میتینو برای گروه شما ساخته شد',
        body: `جلسه «${meetingTitle}» برای گروه «${group.name}» ساخته شد.\nلینک ورود: ${joinUrl}`,
        type: NotificationType.TRANSACTIONAL,
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
        relatedEntityType: 'CourseGroup',
      })
    } catch (err) {
      this.logger.warn('Failed to send teacher notification for Meetino meeting', err)
    }
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private toReferenceDto(ref: {
    id: string
    sourceType: string
    sourceId: string
    meetinoMeetingId: string | null
    meetinoSlug: string | null
    title: string
    joinUrl: string
    hostUrl: string | null
    status: string
    startsAt: Date | null
    endsAt: Date | null
    createdById: string
    lastSyncedAt: Date | null
    metadata: unknown
    createdAt: Date
    updatedAt: Date
  }): MeetinoMeetingReferenceDto {
    return {
      id: ref.id,
      sourceType: ref.sourceType as MeetinoMeetingSourceType,
      sourceId: ref.sourceId,
      meetinoMeetingId: ref.meetinoMeetingId,
      meetinoSlug: ref.meetinoSlug,
      title: ref.title,
      joinUrl: ref.joinUrl,
      hostUrl: ref.hostUrl,
      status: ref.status as MeetinoMeetingStatus,
      startsAt: ref.startsAt?.toISOString() ?? null,
      endsAt: ref.endsAt?.toISOString() ?? null,
      createdById: ref.createdById,
      lastSyncedAt: ref.lastSyncedAt?.toISOString() ?? null,
      metadata: ref.metadata as Record<string, unknown> | null,
      createdAt: ref.createdAt.toISOString(),
      updatedAt: ref.updatedAt.toISOString(),
    }
  }

  private toAttendanceDto(r: {
    id: string
    referenceId: string
    meetinoParticipantId: string | null
    userId: string | null
    studentId: string | null
    displayName: string
    participantType: string
    joinedAt: Date | null
    leftAt: Date | null
    durationSeconds: number | null
    wasGuest: boolean
    createdAt: Date
  }): MeetinoAttendanceRecordDto {
    return {
      id: r.id,
      referenceId: r.referenceId,
      meetinoParticipantId: r.meetinoParticipantId,
      userId: r.userId,
      studentId: r.studentId,
      displayName: r.displayName,
      participantType: r.participantType as MeetinoParticipantType,
      joinedAt: r.joinedAt?.toISOString() ?? null,
      leftAt: r.leftAt?.toISOString() ?? null,
      durationSeconds: r.durationSeconds,
      wasGuest: r.wasGuest,
      createdAt: r.createdAt.toISOString(),
    }
  }
}
