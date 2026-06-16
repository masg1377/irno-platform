import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SmsService } from './sms/sms.service'
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  UserRole,
} from '@irno/types'
import type {
  NotificationDto,
  PaginatedNotifications,
  NotificationTemplateDto,
  NotificationPreferenceDto,
  NotificationDeliveryDto,
  PaginatedNotificationDeliveries,
  CurrentUser,
} from '@irno/types'
import type { UpdatePreferencesDto } from './dto/update-preferences.dto'
import type { CreateTemplateDto } from './dto/create-template.dto'
import type { AdminSendNotificationDto } from './dto/admin-send-notification.dto'

// Prisma client typed as any for Phase 7 delegates (stub in sandbox)
type AnyPrisma = {
  notification: {
    create: (args: unknown) => Promise<unknown>
    findMany: (args: unknown) => Promise<unknown[]>
    findFirst: (args: unknown) => Promise<unknown | null>
    findUnique: (args: unknown) => Promise<unknown | null>
    update: (args: unknown) => Promise<unknown>
    updateMany: (args: unknown) => Promise<unknown>
    count: (args: unknown) => Promise<number>
  }
  notificationTemplate: {
    create: (args: unknown) => Promise<unknown>
    findMany: (args: unknown) => Promise<unknown[]>
    findUnique: (args: unknown) => Promise<unknown | null>
    update: (args: unknown) => Promise<unknown>
    delete: (args: unknown) => Promise<unknown>
  }
  notificationPreference: {
    upsert: (args: unknown) => Promise<unknown>
    findUnique: (args: unknown) => Promise<unknown | null>
  }
  notificationDelivery: {
    findMany: (args: unknown) => Promise<unknown[]>
    count: (args: unknown) => Promise<number>
  }
  user: {
    findMany: (args: unknown) => Promise<unknown[]>
  }
}

interface NotifyUserInput {
  recipientUserId: string
  title: string
  body: string
  type: NotificationType
  channels?: NotificationChannel[]
  priority?: NotificationPriority
  relatedEntityType?: string
  relatedEntityId?: string
  metadata?: Record<string, unknown>
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  private get db(): AnyPrisma {
    return this.prisma as unknown as AnyPrisma
  }

  // ─── Core notify ───────────────────────────────────────────────────────────

  async notifyUser(input: NotifyUserInput): Promise<NotificationDto> {
    const channels = input.channels ?? [NotificationChannel.IN_APP]
    const priority = input.priority ?? NotificationPriority.NORMAL

    const notification = (await this.db.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        title: input.title,
        body: input.body,
        type: input.type,
        channel: channels[0],
        status: NotificationStatus.PENDING,
        priority,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        metadata: input.metadata ?? null,
      },
    })) as Record<string, unknown>

    // For SMS channel, delegate to SmsService
    if (channels.includes(NotificationChannel.SMS)) {
      // We don't have the user's mobile here directly; SMS would need a lookup
      // Kept as no-op for now — would require fetching user mobile
    }

    return this.mapNotification(notification)
  }

  async notifyUsers(
    userIds: string[],
    input: Omit<NotifyUserInput, 'recipientUserId'>,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) => this.notifyUser({ ...input, recipientUserId: userId })),
    )
  }

  async notifyByRoles(
    roles: UserRole[],
    input: Omit<NotifyUserInput, 'recipientUserId'>,
  ): Promise<void> {
    const users = (await this.db.user.findMany({
      where: { role: { in: roles }, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    })) as { id: string }[]

    await this.notifyUsers(
      users.map((u) => u.id),
      input,
    )
  }

  // ─── User queries ──────────────────────────────────────────────────────────

  async getMyNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean
      type?: NotificationType
      page?: number
      limit?: number
    },
  ): Promise<PaginatedNotifications> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { recipientUserId: userId }
    if (options.unreadOnly) where['readAt'] = null
    if (options.type) where['type'] = options.type

    const [rows, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.notification.count({ where }),
    ])

    return {
      data: (rows as Record<string, unknown>[]).map(this.mapNotification),
      total,
      page,
      limit,
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.db.notification.count({
      where: { recipientUserId: userId, readAt: null },
    })
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = (await this.db.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    })) as Record<string, unknown> | null

    if (!notification) throw new NotFoundException('اعلان یافت نشد')

    await this.db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    })
  }

  // ─── Preferences ───────────────────────────────────────────────────────────

  async getMyPreferences(userId: string): Promise<NotificationPreferenceDto> {
    const pref = (await this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })) as Record<string, unknown>

    return this.mapPreference(pref)
  }

  async updateMyPreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceDto> {
    const pref = (await this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    })) as Record<string, unknown>

    return this.mapPreference(pref)
  }

  // ─── Templates ─────────────────────────────────────────────────────────────

  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplateDto> {
    const tmpl = (await this.db.notificationTemplate.create({
      data: {
        key: dto.key,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        channel: dto.channel,
        isActive: dto.isActive ?? true,
        variables: dto.variables ?? null,
      },
    })) as Record<string, unknown>

    return this.mapTemplate(tmpl)
  }

  async listTemplates(): Promise<NotificationTemplateDto[]> {
    const rows = (await this.db.notificationTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })) as Record<string, unknown>[]

    return rows.map(this.mapTemplate)
  }

  async updateTemplate(
    id: string,
    dto: Partial<CreateTemplateDto>,
  ): Promise<NotificationTemplateDto> {
    const tmpl = (await this.db.notificationTemplate.update({
      where: { id },
      data: dto,
    })) as Record<string, unknown>

    return this.mapTemplate(tmpl)
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.notificationTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  // ─── Admin send ────────────────────────────────────────────────────────────

  async adminSendNotification(
    dto: AdminSendNotificationDto,
    _actor: CurrentUser,
  ): Promise<{ sent: number }> {
    let userIds: string[] = dto.userIds ?? []

    if (dto.roles && dto.roles.length > 0) {
      const users = (await this.db.user.findMany({
        where: { role: { in: dto.roles }, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      })) as { id: string }[]
      userIds = [...new Set([...userIds, ...users.map((u) => u.id)])]
    }

    if (userIds.length === 0) return { sent: 0 }

    const input: Omit<NotifyUserInput, 'recipientUserId'> = {
      title: dto.title,
      body: dto.body,
      type: dto.type,
      channels: dto.channels,
      priority: dto.priority,
      relatedEntityType: dto.relatedEntityType,
      relatedEntityId: dto.relatedEntityId,
    }

    await this.notifyUsers(userIds, input)
    return { sent: userIds.length }
  }

  // ─── Delivery logs ─────────────────────────────────────────────────────────

  async getDeliveries(options: {
    status?: NotificationStatus
    channel?: NotificationChannel
    page?: number
    limit?: number
  }): Promise<PaginatedNotificationDeliveries> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (options.status) where['status'] = options.status
    if (options.channel) where['channel'] = options.channel

    const [rows, total] = await Promise.all([
      this.db.notificationDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.notificationDelivery.count({ where }),
    ])

    return {
      data: (rows as Record<string, unknown>[]).map(this.mapDelivery),
      total,
      page,
      limit,
    }
  }

  // ─── Template rendering ────────────────────────────────────────────────────

  async renderTemplate(
    key: string,
    variables: Record<string, string>,
  ): Promise<{ title: string; body: string }> {
    const tmpl = (await this.db.notificationTemplate.findUnique({
      where: { key },
    })) as Record<string, unknown> | null

    if (!tmpl) throw new NotFoundException(`قالب '${key}' یافت نشد`)

    let title = String(tmpl['title'])
    let body = String(tmpl['body'])

    for (const [k, v] of Object.entries(variables)) {
      title = title.replaceAll(`{{${k}}}`, v)
      body = body.replaceAll(`{{${k}}}`, v)
    }

    return { title, body }
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private mapNotification(row: Record<string, unknown>): NotificationDto {
    return {
      id: String(row['id']),
      recipientUserId: String(row['recipientUserId']),
      title: String(row['title']),
      body: String(row['body']),
      type: row['type'] as NotificationType,
      channel: row['channel'] as NotificationChannel,
      status: row['status'] as NotificationStatus,
      priority: row['priority'] as NotificationPriority,
      relatedEntityType: (row['relatedEntityType'] as string | null) ?? null,
      relatedEntityId: (row['relatedEntityId'] as string | null) ?? null,
      metadata: (row['metadata'] as Record<string, unknown> | null) ?? null,
      readAt: row['readAt'] ? String(row['readAt']) : null,
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
    }
  }

  private mapTemplate(row: Record<string, unknown>): NotificationTemplateDto {
    return {
      id: String(row['id']),
      key: String(row['key']),
      title: String(row['title']),
      body: String(row['body']),
      type: row['type'] as NotificationType,
      channel: row['channel'] as NotificationChannel,
      isActive: Boolean(row['isActive']),
      variables: (row['variables'] as Record<string, unknown> | null) ?? null,
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
    }
  }

  private mapPreference(row: Record<string, unknown>): NotificationPreferenceDto {
    return {
      userId: String(row['userId']),
      inAppEnabled: Boolean(row['inAppEnabled'] ?? true),
      smsTransactionalEnabled: Boolean(row['smsTransactionalEnabled'] ?? true),
      smsMarketingEnabled: Boolean(row['smsMarketingEnabled'] ?? false),
      emailEnabled: Boolean(row['emailEnabled'] ?? false),
      telegramEnabled: Boolean(row['telegramEnabled'] ?? false),
    }
  }

  private mapDelivery(row: Record<string, unknown>): NotificationDeliveryDto {
    return {
      id: String(row['id']),
      notificationId: String(row['notificationId']),
      channel: row['channel'] as NotificationChannel,
      status: row['status'] as NotificationStatus,
      provider: (row['provider'] as string | null) ?? null,
      providerMessageId: (row['providerMessageId'] as string | null) ?? null,
      errorMessage: (row['errorMessage'] as string | null) ?? null,
      sentAt: row['sentAt'] ? String(row['sentAt']) : null,
      createdAt: String(row['createdAt']),
    }
  }
}
