import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { RedisKey } from '../redis/redis-keys'
import { TaxonomyTermType, TaxonomyTermStatus } from '@irno/types'
import type { TaxonomyTermDto, PaginatedTaxonomyTerms } from '@irno/types'
import type { CreateTaxonomyTermDto } from './dto/create-taxonomy-term.dto'
import type { UpdateTaxonomyTermDto } from './dto/update-taxonomy-term.dto'

interface ListOptions {
  type?: TaxonomyTermType
  status?: TaxonomyTermStatus
  search?: string
  parentId?: string
  page?: number
  limit?: number
}

@Injectable()
export class TaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Invalidate the lookup cache for a taxonomy type after any write. */
  private async invalidateTaxonomyCache(type: TaxonomyTermType): Promise<void> {
    try {
      await this.redis.del(RedisKey.cacheTaxonomy(type))
    } catch { /* non-fatal — cache miss on next request is fine */ }
  }

  private get db() {
    return this.prisma as any
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async list(options: ListOptions = {}): Promise<PaginatedTaxonomyTerms> {
    const {
      type,
      status,
      search,
      parentId,
      page = 1,
      limit = 20,
    } = options

    const safePage = Math.max(1, page)
    const safeLimit = Math.min(50, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(parentId !== undefined
        ? { parentId: parentId === 'null' ? null : parentId }
        : {}),
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    }

    const [rows, total] = await Promise.all([
      this.db.taxonomyTerm.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        include: {
          parent: {
            select: { id: true, title: true },
          },
        },
      }),
      this.db.taxonomyTerm.count({ where }),
    ])

    return {
      data: rows.map((r: any) => this.toDto(r, r.parent)),
      total,
      page: safePage,
      limit: safeLimit,
    }
  }

  // ─── Find by ID ────────────────────────────────────────────────────────────

  async findById(id: string): Promise<TaxonomyTermDto> {
    const row = await this.db.taxonomyTerm.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: {
          select: { id: true, title: true },
        },
      },
    })
    if (!row) throw new NotFoundException('دسته‌بندی یافت نشد')
    return this.toDto(row, row.parent)
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateTaxonomyTermDto): Promise<TaxonomyTermDto> {
    await this.assertSlugUniqueForType(dto.type, dto.slug)

    const row = await this.db.taxonomyTerm.create({
      data: {
        type: dto.type,
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        status: dto.status ?? TaxonomyTermStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 0,
        color: dto.color ?? null,
        icon: dto.icon ?? null,
        metadata: dto.metadata ?? null,
      },
      include: {
        parent: {
          select: { id: true, title: true },
        },
      },
    })

    void this.invalidateTaxonomyCache(dto.type)
    return this.toDto(row, row.parent)
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTaxonomyTermDto): Promise<TaxonomyTermDto> {
    const existing = await this.db.taxonomyTerm.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('دسته‌بندی یافت نشد')

    if (dto.slug && dto.slug !== existing.slug) {
      await this.assertSlugUniqueForType(existing.type, dto.slug, id)
    }

    const row = await this.db.taxonomyTerm.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      },
      include: {
        parent: {
          select: { id: true, title: true },
        },
      },
    })

    void this.invalidateTaxonomyCache(existing.type as TaxonomyTermType)
    return this.toDto(row, row.parent)
  }

  // ─── Delete (soft) ─────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const existing = await this.db.taxonomyTerm.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('دسته‌بندی یافت نشد')

    // Check if used by courses, skills, credits, or events
    const [courseCount, skillCount, creditCount, eventCount] = await Promise.all([
      this.db.course.count({ where: { categoryId: id, deletedAt: null } }),
      this.db.skill.count({ where: { categoryId: id, deletedAt: null } }),
      this.db.credit.count({ where: { categoryId: id, deletedAt: null } }),
      this.db.event.count({ where: { categoryId: id, deletedAt: null } }),
    ])

    const inUse = courseCount + skillCount + creditCount + eventCount > 0

    if (inUse) {
      // Archive instead of hard delete
      await this.db.taxonomyTerm.update({
        where: { id },
        data: {
          status: TaxonomyTermStatus.ARCHIVED,
          deletedAt: new Date(),
        },
      })
    } else {
      await this.db.taxonomyTerm.update({
        where: { id },
        data: {
          status: TaxonomyTermStatus.ARCHIVED,
          deletedAt: new Date(),
        },
      })
    }
    void this.invalidateTaxonomyCache(existing.type as TaxonomyTermType)
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async assertSlugUniqueForType(
    type: TaxonomyTermType,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.db.taxonomyTerm.findFirst({
      where: {
        type,
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
    if (existing) {
      throw new ConflictException(
        'این شناسه (slug) برای این نوع دسته‌بندی قبلاً استفاده شده است',
      )
    }
  }

  private toDto(row: any, parent?: any): TaxonomyTermDto {
    return {
      id: row.id,
      type: row.type as TaxonomyTermType,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      parentId: row.parentId ?? null,
      parentTitle: parent?.title ?? null,
      status: row.status as TaxonomyTermStatus,
      sortOrder: row.sortOrder,
      color: row.color ?? null,
      icon: row.icon ?? null,
      metadata: row.metadata ?? null,
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    }
  }
}
