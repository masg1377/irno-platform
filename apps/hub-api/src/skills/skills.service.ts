import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SkillLevel, SkillStatus } from '@irno/types'
import type { SkillDto, PaginatedSkills } from '@irno/types'
import type { CreateSkillDto } from './dto/create-skill.dto'
import type { UpdateSkillDto } from './dto/update-skill.dto'

interface ListSkillsOptions {
  search?: string
  category?: string
  categoryId?: string
  level?: SkillLevel
  status?: SkillStatus
  page?: number
  limit?: number
}

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async findAll(options: ListSkillsOptions = {}): Promise<PaginatedSkills> {
    const { search, category, categoryId, level, status, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(level ? { level } : {}),
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : category ? { category: { contains: category, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      this.db.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.skill.count({ where }),
    ])

    return {
      data: data.map((s: any) => this.toDto(s)),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<SkillDto> {
    const skill = await this.db.skill.findFirst({
      where: { id, deletedAt: null },
    })
    if (!skill) throw new NotFoundException('مهارت یافت نشد')
    return this.toDto(skill)
  }

  // ─── Find by slug (internal use) ──────────────────────────────────────────

  async findBySlug(slug: string): Promise<SkillDto | null> {
    const skill = await this.db.skill.findFirst({
      where: { slug, deletedAt: null },
    })
    return skill ? this.toDto(skill) : null
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateSkillDto): Promise<SkillDto> {
    await this.assertSlugUnique(dto.slug)

    const skill = await this.db.skill.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        category: dto.category ?? null,
        level: dto.level,
        status: dto.status ?? SkillStatus.ACTIVE,
      },
    })

    return this.toDto(skill)
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateSkillDto): Promise<SkillDto> {
    const skill = await this.db.skill.findFirst({ where: { id, deletedAt: null } })
    if (!skill) throw new NotFoundException('مهارت یافت نشد')

    if (dto.slug && dto.slug !== skill.slug) {
      await this.assertSlugUnique(dto.slug)
    }

    const updated = await this.db.skill.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    })

    return this.toDto(updated)
  }

  // ─── Delete (soft) ─────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const skill = await this.db.skill.findFirst({ where: { id, deletedAt: null } })
    if (!skill) throw new NotFoundException('مهارت یافت نشد')

    await this.db.skill.update({
      where: { id },
      data: {
        status: SkillStatus.ARCHIVED,
        deletedAt: new Date(),
      },
    })
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async assertSlugUnique(slug: string): Promise<void> {
    const existing = await this.db.skill.findFirst({
      where: { slug, deletedAt: null },
    })
    if (existing) throw new ConflictException('این شناسه (slug) قبلاً استفاده شده است')
  }

  private toDto(row: any): SkillDto {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      category: row.category ?? null,
      level: row.level as SkillLevel,
      status: row.status as SkillStatus,
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    }
  }
}
