import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationAdminController } from './notifications-admin.controller'
import { NotificationsService } from './notifications.service'
import { SmsService } from './sms/sms.service'
import { PrismaService } from '../prisma/prisma.service'

/**
 * NotificationsModule — central delivery hub for all Irno notifications.
 *
 * Owns:
 *  - Notification records (in-app)
 *  - NotificationTemplate records
 *  - NotificationDelivery records (audit log per channel)
 *  - NotificationPreference records
 *  - Delivery orchestration via channel-specific services
 *
 * Provider-agnostic by design:
 *  - SMS: SmsService → ISmsProvider → MockSmsProvider (default) or real provider
 *  - Push: IPushProvider (future, optional — Firebase/FCM not required)
 *  - Email: IEmailProvider (future)
 *  - Telegram: ITelegramProvider (future)
 *
 * Other modules (Auth, Finance, Events, Meetino, etc.) MUST NOT send messages
 * directly. They should inject NotificationsService or SmsService from this module.
 *
 * Exports:
 *  - NotificationsService: for in-app + orchestrated multi-channel sends
 *  - SmsService: for direct SMS sends (e.g. OTP in AuthModule)
 */
@Module({
  controllers: [NotificationsController, NotificationAdminController],
  providers: [NotificationsService, SmsService, PrismaService],
  exports: [NotificationsService, SmsService],
})
export class NotificationsModule {}
