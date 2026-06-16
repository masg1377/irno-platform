import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CourseLevel, CourseStatus } from '@irno/types'
import type { CurrentUser, CourseDto, PaginatedCourses } from '@irno/types'
import type { CreateCourseDto } from './dto/create-course.dto'
import type { UpdateCourseDto } from './dto/update-course.dto'

interface ListCoursesOptions {
  search?: string
  status?: CourseStatus
  level?: CourseLevel
  category?: string
  categoryId?: string
  page?: number
  limit?: number
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ──────────────────────────────────────────────────

  async findAll(options: ListCoursesOptions = {}): Promise<PaginatedCourses> {
    const { search, status, level, category, categoryId, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(level ? { level } : {}),
      // categoryId (structured) takes precedence over legacy category text filter
      ...(categoryId ? { categoryId } : category ? { category: { contains: category, mode: 'insensitive' as const } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
              { category: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { courseGroups: true } }, taxonomyCategory: { select: { title: true } } },
      }),
      this.prisma.course.count({ where } as any),
    ])

    return {
      data: (data as any[]).map((c: any) => this.toCourseDto(c)),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ──────────────────────────────────────────────

  async findOne(id: string): Promise<CourseDto> {
    const course = await (this.prisma as any).course.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { courseGroups: true } }, taxonomyCategory: { select: { title: true } } },
    })
    if (!course) throw new NotFoundException('دوره یافت نشد')
    return this.toCourseDto(course)
  }

  // ─── Create ────────────────────────────────────────────────

  async create(dto: CreateCourseDto, actor: CurrentUser): Promise<CourseDto> {
    await this.assertSlugUnique(dto.slug)

    if (dto.defaultTuitionToman !== undefined && !Number.isInteger(dto.defaultTuitionToman)) {
      throw new BadRequestException('شهریه باید عدد صحیح باشد')
    }

    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        category: dto.category ?? '',
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        level: dto.level ?? CourseLevel.ALL_LEVELS,
        defaultTuitionToman: dto.defaultTuitionToman ?? null,
        status: dto.status ?? CourseStatus.DRAFT,
        createdById: actor.id,
      },
      include: { _count: { select: { courseGroups: true } }, taxonomyCategory: { select: { title: true } } },
    })

    return this.toCourseDto(course)
  }

  // ─── Update ────────────────────────────────────────────────

  async update(id: string, dto: UpdateCourseDto): Promise<CourseDto> {
    const course = await this.prisma.course.findFirst({ where: { id, deletedAt: null } })
    if (!course) throw new NotFoundException('دوره یافت نشد')

    if (dto.slug && dto.slug !== course.slug) {
      await this.assertSlugUnique(dto.slug)
    }

    if (dto.defaultTuitionToman !== undefined && dto.defaultTuitionToman !== null && !Number.isInteger(dto.defaultTuitionToman)) {
      throw new BadRequestException('شهریه باید عدد صحیح باشد')
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.defaultTuitionToman !== undefined && { defaultTuitionToman: dto.defaultTuitionToman }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { _count: { select: { courseGroups: true } }, taxonomyCategory: { select: { title: true } } },
    })

    return this.toCourseDto(updated)
  }

  // ─── Archive / soft-delete ─────────────────────────────────

  async remove(id: string): Promise<{ message: string }> {
    const course = await this.prisma.course.findFirst({ where: { id, deletedAt: null } })
    if (!course) throw new NotFoundException('دوره یافت نشد')

    // If it has active groups, archive instead of deleting
    const activeGroups = await this.prisma.courseGroup.count({
      where: { courseId: id, deletedAt: null, status: { in: ['UPCOMING', 'ACTIVE'] } },
    })
    if (activeGroups > 0) {
      // Archive the course
      await this.prisma.course.update({ where: { id }, data: { status: CourseStatus.ARCHIVED } })
      return { message: `دوره به دلیل وجود ${activeGroups} گروه فعال، آرشیو شد` }
    }

    await this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'دوره با موفقیت حذف شد' }
  }

  // ─── Helpers ───────────────────────────────────────────────

  private async assertSlugUnique(slug: string): Promise<void> {
    const existing = await this.prisma.course.findFirst({ where: { slug, deletedAt: null } })
    if (existing) throw new ConflictException('این slug قبلاً استفاده شده است')
  }

  private toCourseDto(
    c: {
      id: string; title: string; slug: string; description: string | null
      category: string | null; categoryId?: string | null; level: string
      defaultTuitionToman: number | null; status: string; createdById: string
      createdAt: Date; updatedAt: Date; _count?: { courseGroups: number }
      taxonomyCategory?: { title: string } | null
    }
  ): CourseDto {
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      category: c.category,
      categoryId: c.categoryId ?? null,
      categoryTitle: c.taxonomyCategory?.title ?? null,
      level: c.level as CourseLevel,
      defaultTuitionToman: c.defaultTuitionToman,
      status: c.status as CourseStatus,
      groupCount: c._count?.courseGroups,
      createdById: c.createdById,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }
}
