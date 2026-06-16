import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreditType, CreditStatus } from '@irno/types'
import type { CreditDto, PaginatedCredits } from '@irno/types'
import type { CreateCreditDto } from './dto/create-credit.dto'
import type { UpdateCreditDto } from './dto/update-credit.dto'

interface ListCreditsOptions {
  search?: string
  type?: CreditType
  status?: CreditStatus
  categoryId?: string
  page?: number
  limit?: number
}

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async findAll(options: ListCreditsOptions = {}): Promise<PaginatedCredits> {
    const { search, type, status, categoryId, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      this.db.credit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.credit.count({ where }),
    ])

    return {
      data: data.map((c: any) => this.toDto(c)),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<CreditDto> {
    const credit = await this.db.credit.findFirst({
      where: { id, deletedAt: null },
    })
    if (!credit) throw new NotFoundException('اعتبار یافت نشد')
    return this.toDto(credit)
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateCreditDto): Promise<CreditDto> {
    await this.assertSlugUnique(dto.slug)

    const credit = await this.db.credit.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        type: dto.type,
        status: dto.status ?? CreditStatus.ACTIVE,
        expiresAfterDays: dto.expiresAfterDays ?? null,
      },
    })

    return this.toDto(credit)
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCreditDto): Promise<CreditDto> {
    const credit = await this.db.credit.findFirst({ where: { id, deletedAt: null } })
    if (!credit) throw new NotFoundException('اعتبار یافت نشد')

    if (dto.slug && dto.slug !== credit.slug) {
      await this.assertSlugUnique(dto.slug)
    }

    const updated = await this.db.credit.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.expiresAfterDays !== undefined && { expiresAfterDays: dto.expiresAfterDays }),
      },
    })

    return this.toDto(updated)
  }

  // ─── Delete (soft) ─────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const credit = await this.db.credit.findFirst({ where: { id, deletedAt: null } })
    if (!credit) throw new NotFoundException('اعتبار یافت نشد')

    await this.db.credit.update({
      where: { id },
      data: {
        status: CreditStatus.ARCHIVED,
        deletedAt: new Date(),
      },
    })
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async assertSlugUnique(slug: string): Promise<void> {
    const existing = await this.db.credit.findFirst({
      where: { slug, deletedAt: null },
    })
    if (existing) throw new ConflictException('این شناسه (slug) قبلاً استفاده شده است')
  }

  private toDto(row: any): CreditDto {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      type: row.type as CreditType,
      status: row.status as CreditStatus,
      expiresAfterDays: row.expiresAfterDays ?? null,
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    }
  }
}
