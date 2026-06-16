import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import type { CurrentUser } from '@irno/types'
import { NotificationType } from '@irno/types'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── GET /notifications ──────────────────────────────────────────────────────
  @Get('notifications')
  async getMyNotifications(
    @CurrentUserDec() user: CurrentUser,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getMyNotifications(user.id, {
      unreadOnly: unreadOnly === 'true',
      type: type as NotificationType | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  // ── GET /notifications/unread-count ────────────────────────────────────────
  @Get('notifications/unread-count')
  async getUnreadCount(@CurrentUserDec() user: CurrentUser) {
    const count = await this.notificationsService.getUnreadCount(user.id)
    return { count }
  }

  // ── PATCH /notifications/read-all ──────────────────────────────────────────
  @Patch('notifications/read-all')
  async markAllAsRead(@CurrentUserDec() user: CurrentUser) {
    await this.notificationsService.markAllAsRead(user.id)
    return { success: true }
  }

  // ── PATCH /notifications/:id/read ──────────────────────────────────────────
  @Patch('notifications/:id/read')
  async markAsRead(@Param('id') id: string, @CurrentUserDec() user: CurrentUser) {
    await this.notificationsService.markAsRead(user.id, id)
    return { success: true }
  }

  // ── GET /notification-preferences/me ───────────────────────────────────────
  @Get('notification-preferences/me')
  async getPreferences(@CurrentUserDec() user: CurrentUser) {
    return this.notificationsService.getMyPreferences(user.id)
  }

  // ── PATCH /notification-preferences/me ────────────────────────────────────
  @Patch('notification-preferences/me')
  async updatePreferences(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updateMyPreferences(user.id, dto)
  }
}
