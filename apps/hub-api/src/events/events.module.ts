import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { MeetinoIntegrationModule } from '../meetino-integration/meetino-integration.module'

@Module({
  imports: [NotificationsModule, MeetinoIntegrationModule],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
