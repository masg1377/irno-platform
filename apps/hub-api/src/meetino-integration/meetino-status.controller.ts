import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@irno/types'
import { MeetinoClientService } from './meetino-client.service'
import { MeetinoIntegrationService } from './meetino-integration.service'

@Controller('integrations/meetino')
export class MeetinoStatusController {
  constructor(
    private readonly client: MeetinoClientService,
    private readonly integrationService: MeetinoIntegrationService,
  ) {}

  /**
   * GET /api/v1/integrations/meetino/status
   * Returns integration config status — never exposes secrets.
   */
  @Get('status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getStatus() {
    return this.integrationService.getIntegrationStatus()
  }

  /**
   * POST /api/v1/integrations/meetino/test
   * Tests connectivity to Meetino API or web URL.
   */
  @Post('test')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testConnection() {
    return this.client.testConnection()
  }
}
