import { Module } from '@nestjs/common'
import { MeetinoClientService } from './meetino-client.service'
import { MeetinoIntegrationService } from './meetino-integration.service'
import { MeetinoStatusController } from './meetino-status.controller'
import { MeetinoWebhookController } from './meetino-webhook.controller'
import { MeetinoSsoService } from './meetino-sso.service'
import { MeetinoSsoController } from './meetino-sso.controller'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsModule } from '../notifications/notifications.module'

// RedisModule is @Global() — RedisService is injected without explicit import.

@Module({
  imports: [NotificationsModule],
  controllers: [MeetinoStatusController, MeetinoWebhookController, MeetinoSsoController],
  providers: [MeetinoClientService, MeetinoIntegrationService, MeetinoSsoService, PrismaService],
  exports: [MeetinoClientService, MeetinoIntegrationService, MeetinoSsoService],
})
export class MeetinoIntegrationModule {}
