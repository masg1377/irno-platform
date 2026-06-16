import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CurrentUser, AppModuleDto } from '@irno/types'
import { UserRole } from '@irno/types'

@Injectable()
export class AppsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the list of apps visible to the requesting user.
   *
   * Filtering logic:
   * - SUPER_ADMIN and ADMIN see all apps (including COMING_SOON and DISABLED)
   *   so they can manage the launcher.
   * - Other roles see only apps where their role is in allowedRoles
   *   and status is ACTIVE or COMING_SOON (not DISABLED).
   */
  async findAll(user: CurrentUser): Promise<AppModuleDto[]> {
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN

    const apps = await this.prisma.appModule.findMany({
      where: isAdmin
        ? undefined
        : {
            allowedRoles: { has: user.role },
            status: { in: ['ACTIVE', 'COMING_SOON'] },
          },
      orderBy: { sortOrder: 'asc' },
    })

    return apps.map(this.toDto)
  }

  /**
   * GET /api/v1/apps/:id — admin use (update apps, manage launcher).
   */
  async findOne(id: string): Promise<AppModuleDto> {
    const app = await this.prisma.appModule.findUnique({ where: { id } })
    if (!app) throw new NotFoundException('اپ یافت نشد')
    return this.toDto(app)
  }

  private toDto(app: {
    id: string
    key: string
    nameLocal: string
    description: string | null
    url: string
    iconUrl: string | null
    status: string
    allowedRoles: string[]
    sortOrder: number
  }): AppModuleDto {
    return {
      id: app.id,
      key: app.key as AppModuleDto['key'],
      nameLocal: app.nameLocal,
      description: app.description,
      url: app.url,
      iconUrl: app.iconUrl,
      status: app.status as AppModuleDto['status'],
      allowedRoles: app.allowedRoles as AppModuleDto['allowedRoles'],
      sortOrder: app.sortOrder,
    }
  }
}
