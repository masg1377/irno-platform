import { Controller, Get, Query } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole, TaxonomyTermStatus } from '@irno/types'

interface LookupOption {
  id: string
  label: string
  subtitle?: string | null
  status?: string | null
}

@Controller('lookup')
export class LookupController {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any
  }

  /**
   * GET /api/v1/lookup/taxonomy?type=&search=
   * Taxonomy terms for selectors.
   */
  @Get('taxonomy')
  async taxonomy(
    @Query('type') type?: string,
    @Query('search') search?: string,
  ): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: TaxonomyTermStatus.ACTIVE,
      ...(type ? { type } : {}),
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    }

    const rows = await this.db.taxonomyTerm.findMany({
      where,
      take: 50,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, type: true, status: true },
    })

    return rows.map((r: any) => ({
      id: r.id,
      label: r.title,
      subtitle: r.type,
      status: r.status,
    }))
  }

  /**
   * GET /api/v1/lookup/skills?search=
   * Active skills for selectors.
   */
  @Get('skills')
  async skills(@Query('search') search?: string): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: 'ACTIVE',
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    }

    const rows = await this.db.skill.findMany({
      where,
      take: 50,
      orderBy: { title: 'asc' },
      select: { id: true, title: true, category: true, status: true },
    })

    return rows.map((r: any) => ({
      id: r.id,
      label: r.title,
      subtitle: r.category ?? null,
      status: r.status,
    }))
  }

  /**
   * GET /api/v1/lookup/credits?search=
   * Active credits for selectors.
   */
  @Get('credits')
  async credits(@Query('search') search?: string): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: 'ACTIVE',
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    }

    const rows = await this.db.credit.findMany({
      where,
      take: 50,
      orderBy: { title: 'asc' },
      select: { id: true, title: true, type: true, status: true },
    })

    return rows.map((r: any) => ({
      id: r.id,
      label: r.title,
      subtitle: r.type ?? null,
      status: r.status,
    }))
  }

  /**
   * GET /api/v1/lookup/courses?search=
   * Non-archived courses for selectors.
   */
  @Get('courses')
  async courses(@Query('search') search?: string): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: { not: 'ARCHIVED' },
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    }

    const rows = await this.db.course.findMany({
      where,
      take: 50,
      orderBy: { title: 'asc' },
      select: { id: true, title: true, category: true, status: true },
    })

    return rows.map((r: any) => ({
      id: r.id,
      label: r.title,
      subtitle: r.category ?? null,
      status: r.status,
    }))
  }

  /**
   * GET /api/v1/lookup/course-groups?courseId=&search=
   * Course groups for selectors.
   */
  @Get('course-groups')
  async courseGroups(
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
  ): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(courseId ? { courseId } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    }

    const rows = await this.db.courseGroup.findMany({
      where,
      take: 50,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true },
    })

    return rows.map((r: any) => ({
      id: r.id,
      label: r.name,
      subtitle: r.status ?? null,
      status: r.status,
    }))
  }

  /**
   * GET /api/v1/lookup/students?search=
   * Students for selectors (joined with user + profile).
   */
  @Get('students')
  async students(@Query('search') search?: string): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              {
                user: {
                  profile: {
                    OR: [
                      { firstName: { contains: search, mode: 'insensitive' } },
                      { lastName: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
              { studentCode: { contains: search, mode: 'insensitive' } },
              { user: { mobile: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const rows = await this.db.student.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        studentCode: true,
        status: true,
        user: {
          select: {
            mobile: true,
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    return rows.map((r: any) => {
      const firstName = r.user?.profile?.firstName ?? ''
      const lastName = r.user?.profile?.lastName ?? ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'بدون نام'
      const mobile = r.user?.mobile ?? ''
      return {
        id: r.id,
        label: fullName,
        subtitle: [mobile, r.studentCode].filter(Boolean).join(' | '),
        status: r.status,
      }
    })
  }

  /**
   * GET /api/v1/lookup/users?role=&search=
   * Users for selectors (joined with profile). Never returns passwordHash.
   */
  @Get('users')
  async users(
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { mobile: { contains: search, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    }

    const rows = await this.db.user.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mobile: true,
        role: true,
        status: true,
        profile: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    return rows.map((r: any) => {
      const firstName = r.profile?.firstName ?? ''
      const lastName = r.profile?.lastName ?? ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'بدون نام'
      return {
        id: r.id,
        label: fullName,
        subtitle: [r.mobile, r.role].filter(Boolean).join(' | '),
        status: r.status,
      }
    })
  }

  /**
   * GET /api/v1/lookup/applicants?search=
   * Applicants for selectors (joined with user + profile).
   */
  @Get('applicants')
  async applicants(@Query('search') search?: string): Promise<LookupOption[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const rows = await this.db.applicant.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        status: true,
      },
    })

    return rows.map((r: any) => ({
      id: r.id,
      label: (r.fullName as string) || 'بدون نام',
      subtitle: [r.mobile, r.status].filter(Boolean).join(' | '),
      status: r.status,
    }))
  }
}
