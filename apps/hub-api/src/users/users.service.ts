import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole, UserStatus } from '@irno/types'
import type { CurrentUser, UserWithProfileDto } from '@irno/types'
import type { CreateUserDto } from './dto/create-user.dto'
import type { UpdateUserDto } from './dto/update-user.dto'

interface FindAllOptions {
  search?: string
  role?: UserRole
  status?: UserStatus
  page?: number
  limit?: number
}

export interface PaginatedUsers {
  data: UserWithProfileDto[]
  total: number
  page: number
  limit: number
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List / search ────────────────────────────────────────────────────────

  async findAll(options: FindAllOptions = {}): Promise<PaginatedUsers> {
    const { search, role, status, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where = {
      deletedAt: null,
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { mobile: { contains: search } },
          { email: { contains: search, mode: 'insensitive' as const } },
          {
            profile: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      data: users.map(this.toDto),
      total,
      page,
      limit,
    }
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<UserWithProfileDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { profile: true },
    })

    if (!user) throw new NotFoundException('کاربر یافت نشد')
    return this.toDto(user)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto, actor: CurrentUser): Promise<UserWithProfileDto> {
    // Prevent non-super-admins from creating SUPER_ADMIN accounts
    if (dto.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('فقط مدیر ارشد می‌تواند مدیر ارشد جدید ایجاد کند')
    }

    // Uniqueness checks
    const mobileExists = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } })
    if (mobileExists) throw new ConflictException('این شماره موبایل قبلاً ثبت شده است')

    if (dto.email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (emailExists) throw new ConflictException('این ایمیل قبلاً ثبت شده است')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        email: dto.email ?? null,
        passwordHash,
        role: dto.role ?? UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            city: dto.city ?? null,
          },
        },
      },
      include: { profile: true },
    })

    return this.toDto(user)
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto, actor: CurrentUser): Promise<UserWithProfileDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('کاربر یافت نشد')

    // SUPER_ADMIN protection: only another SUPER_ADMIN can modify a SUPER_ADMIN
    if (
      existing.role === UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('مدیر ارشد توسط ادمین قابل ویرایش نیست')
    }

    // Prevent role downgrade of SUPER_ADMIN by non-SUPER_ADMIN
    if (
      dto.role &&
      existing.role === UserRole.SUPER_ADMIN &&
      dto.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('نقش مدیر ارشد قابل تغییر نیست')
    }

    // Prevent escalation to SUPER_ADMIN by non-SUPER_ADMIN
    if (dto.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('فقط مدیر ارشد می‌تواند این نقش را اعطا کند')
    }

    // Email uniqueness check
    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: id } },
      })
      if (emailExists) throw new ConflictException('این ایمیل قبلاً ثبت شده است')
    }

    const { firstName, lastName, city, avatarUrl, telegramHandle, ...userFields } = dto

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userFields,
        ...(firstName !== undefined ||
          lastName !== undefined ||
          city !== undefined ||
          avatarUrl !== undefined ||
          telegramHandle !== undefined
          ? {
              profile: {
                upsert: {
                  create: {
                    firstName: firstName ?? '',
                    lastName: lastName ?? '',
                    city: city ?? null,
                    avatarUrl: avatarUrl ?? null,
                    telegramHandle: telegramHandle ?? null,
                  },
                  update: {
                    ...(firstName !== undefined && { firstName }),
                    ...(lastName !== undefined && { lastName }),
                    ...(city !== undefined && { city }),
                    ...(avatarUrl !== undefined && { avatarUrl }),
                    ...(telegramHandle !== undefined && { telegramHandle }),
                  },
                },
              },
            }
          : {}),
      },
      include: { profile: true },
    })

    return this.toDto(user)
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────

  async remove(id: string, actor: CurrentUser): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('کاربر یافت نشد')

    // SUPER_ADMIN cannot be deleted by ADMIN
    if (
      existing.role === UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('مدیر ارشد قابل حذف نیست')
    }

    // Self-delete guard
    if (id === actor.id) {
      throw new BadRequestException('نمی‌توانید حساب خود را حذف کنید')
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  // ─── DTO mapper ───────────────────────────────────────────────────────────

  private toDto(user: {
    id: string
    email: string | null
    mobile: string
    role: string
    status: string
    createdAt: Date
    passwordHash?: string | null
    profile: {
      id: string
      userId: string
      firstName: string
      lastName: string
      avatarUrl: string | null
      city: string | null
      telegramHandle: string | null
    } | null
  }): UserWithProfileDto {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role as UserWithProfileDto['role'],
      status: user.status as UserWithProfileDto['status'],
      createdAt: user.createdAt.toISOString(),
      hasPassword: Boolean(user.passwordHash),
      profile: user.profile
        ? {
            id: user.profile.id,
            userId: user.profile.userId,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            avatarUrl: user.profile.avatarUrl,
            city: user.profile.city,
            telegramHandle: user.profile.telegramHandle,
          }
        : null,
    }
  }
}
