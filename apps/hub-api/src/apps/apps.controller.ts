import { Controller, Get, Param } from '@nestjs/common'
import { AppsService } from './apps.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import type { CurrentUser } from '@irno/types'

/**
 * Apps controller — serves the app launcher data.
 * All authenticated users can access their allowed apps.
 * Admins see all apps regardless of allowedRoles.
 */
@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  /**
   * GET /api/v1/apps
   * Returns apps visible to the current user's role.
   */
  @Get()
  findAll(@CurrentUserDec() user: CurrentUser) {
    return this.appsService.findAll(user)
  }

  /**
   * GET /api/v1/apps/:id
   * Returns a single app by ID.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appsService.findOne(id)
  }
}
