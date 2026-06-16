import type { NotificationType, NotificationChannel, NotificationStatus, NotificationPriority } from './enums.js'

export interface NotificationDto {
  id: string
  recipientUserId: string
  title: string
  body: string
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedNotifications {
  data: NotificationDto[]
  total: number
  page: number
  limit: number
}

export interface UnreadCountDto {
  count: number
}

export interface NotificationTemplateDto {
  id: string
  key: string
  title: string
  body: string
  type: NotificationType
  channel: NotificationChannel
  isActive: boolean
  variables: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferenceDto {
  userId: string
  inAppEnabled: boolean
  smsTransactionalEnabled: boolean
  smsMarketingEnabled: boolean
  emailEnabled: boolean
  telegramEnabled: boolean
}

export interface NotificationDeliveryDto {
  id: string
  notificationId: string
  channel: NotificationChannel
  status: NotificationStatus
  provider: string | null
  providerMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
}

export interface PaginatedNotificationDeliveries {
  data: NotificationDeliveryDto[]
  total: number
  page: number
  limit: number
}
