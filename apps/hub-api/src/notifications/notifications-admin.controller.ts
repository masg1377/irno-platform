import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { UserRole } from '@irno/types'
import type { CurrentUser, NotificationStatus, NotificationChannel } from '@irno/types'
import { CreateTemplateDto } from './dto/create-template.dto'
import { AdminSendNotificationDto } from './dto/admin-send-notification.dto'

@Controller('admin')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class NotificationAdminController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── GET /admin/notification-templates ──────────────────────────────────────
  @Get('notification-templates')
  listTemplates() {
    return this.notificationsService.listTemplates()
  }

  // ── POST /admin/notification-templates ─────────────────────────────────────
  @Post('notification-templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(dto)
  }

  // ── PATCH /admin/notification-templates/:id ────────────────────────────────
  @Patch('notification-templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.notificationsService.updateTemplate(id, dto)
  }

  // ── DELETE /admin/notification-templates/:id ───────────────────────────────
  @Delete('notification-templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id)
  }

  // ── POST /admin/notifications/send ─────────────────────────────────────────
  @Post('notifications/send')
  sendNotification(
    @Body() dto: AdminSendNotificationDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.notificationsService.adminSendNotification(dto, actor)
  }

  // ── GET /admin/notifications/deliveries ───────────────────────────────────
  @Get('notifications/deliveries')
  getDeliveries(
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getDeliveries({
      status: status as NotificationStatus | undefined,
      channel: channel as NotificationChannel | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }
}
