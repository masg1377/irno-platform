import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import type { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { OtpService } from './otp.service'
import { SmsService } from '../notifications/sms/sms.service'
import type { ApiEnv } from '@irno/validators'
import type { CurrentUser, UserWithProfileDto, OtpRequestResponseDto, OtpNeedsProfileDto } from '@irno/types'
import { UserRole, UserStatus } from '@irno/types'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import type { ChangePasswordDto } from './dto/change-password.dto'
import type { SetPasswordDto } from './dto/set-password.dto'
import type { OtpRequestDto } from './dto/otp-request.dto'
import type { OtpVerifyDto } from './dto/otp-verify.dto'

/** Redis key pattern for refresh token hash storage */
const rtKey = (userId: string) => `irno:rt:${userId}`

/** Convert e.g. "7d" → seconds for Redis TTL */
function parseTtlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl)
  if (!match) return 7 * 24 * 3600
  const n = parseInt(match[1]!, 10)
  switch (match[2]) {
    case 's': return n
    case 'm': return n * 60
    case 'h': return n * 3600
    case 'd': return n * 86400
    default: return 7 * 24 * 3600
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv>,
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
  ) {}

  // ─── Login ──────────────────────────────────────────────────────────────

  async login(dto: LoginDto, res: Response): Promise<UserWithProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
      include: { profile: true },
    })

    // User exists but has no password — guide them to OTP login
    if (user && !user.passwordHash) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'NO_PASSWORD',
        message: 'برای ورود، از کد یک‌بارمصرف استفاده کنید.',
      })
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور اشتباه است')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور اشتباه است')
    }

    this.assertAccountActive(user.status as UserStatus, user.deletedAt)

    await this.issueTokenPair(user.id, user.role as string, user.status as string, res)

    return this.toUserWithProfileDto(user)
  }

  // ─── Public registration (Irno ID) ──────────────────────────────────────

  /**
   * POST /api/v1/auth/register
   *
   * Creates a new Irno ID account for a publicly self-registering user.
   * - Creates User (role=APPLICANT, status=ACTIVE)
   * - Creates Profile
   * - Creates Applicant CRM record (source=WEBSITE, createdById=self)
   * - Issues auth cookies and returns user profile
   *
   * Does NOT create Student, Enrollment, or Payment records.
   * The Applicant → Student → Enrollment flow remains an internal Hub business flow.
   */
  async register(dto: RegisterDto, res: Response): Promise<UserWithProfileDto> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('رمز عبور و تکرار آن مطابقت ندارند')
    }

    // Uniqueness checks
    const mobileExists = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } })
    if (mobileExists) {
      throw new ConflictException('این شماره موبایل قبلاً ثبت شده است')
    }

    if (dto.email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (emailExists) {
        throw new ConflictException('این ایمیل قبلاً ثبت شده است')
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    // Create User + Profile atomically
    const user = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        email: dto.email ?? null,
        passwordHash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: UserRole.APPLICANT as any, // Prisma client requires db:generate after migration
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
      include: { profile: true },
    })

    // Create Applicant CRM record so staff can track and follow up
    // createdById = self (user just created their own account)
    try {
      await this.prisma.applicant.create({
        data: {
          fullName: `${dto.firstName} ${dto.lastName}`,
          mobile: dto.mobile,
          email: dto.email ?? null,
          source: 'WEBSITE',
          createdById: user.id,
        },
      })
    } catch (err) {
      // Non-fatal — user is created; applicant record failure is logged only
      this.logger.warn(`Could not create Applicant record for user ${user.id}: ${(err as Error).message}`)
    }

    await this.issueTokenPair(user.id, user.role as string, user.status as string, res)

    this.logger.log(`New Irno ID registration: ${user.mobile} (${user.id})`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.toUserWithProfileDto(user as any)
  }

  // ─── OTP: Request ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/auth/otp/request
   *
   * Creates a new OTP for the given mobile and sends it via SMS provider.
   * Never reveals whether the mobile exists in the system.
   * Returns a generic success message + cooldown info.
   */
  async requestOtp(dto: OtpRequestDto): Promise<OtpRequestResponseDto> {
    const normalizedMobile = this.otpService.normalizeMobile(dto.mobile)

    // Look up user to link OTP (optional) — we don't reveal existence in response
    const existingUser = await this.prisma.user.findUnique({
      where: { mobile: normalizedMobile },
      select: { id: true },
    })

    const purpose = dto.purpose ?? (existingUser ? 'LOGIN' : 'REGISTER')

    const { code, cooldownSeconds } = await this.otpService.createOtp(
      normalizedMobile,
      purpose,
      existingUser?.id,
    )

    // Deliver via central SmsService — no direct provider call here
    const otpMessage = `کد ورود ایرنو: ${code}\nاین کد ۲ دقیقه معتبر است.`
    await this.smsService.send(normalizedMobile, otpMessage)

    return {
      message: 'کد تأیید ارسال شد.',
      cooldownSeconds,
      // Only expose raw code when SMS provider is mock (dev mode) — never in production
      ...(this.smsService.providerName === 'mock' ? { devCode: code } : {}),
    }
  }

  // ─── OTP: Verify ────────────────────────────────────────────────────────

  /**
   * POST /api/v1/auth/otp/verify
   *
   * Verifies the OTP code. On success:
   * - If user exists: activates account if PENDING, logs in.
   * - If user does not exist and firstName+lastName provided: creates APPLICANT user.
   * - If user does not exist and no profile data: returns needsProfile=true.
   *
   * Does NOT create Student, Enrollment, or Payment.
   */
  async verifyOtp(
    dto: OtpVerifyDto,
    res: Response,
  ): Promise<UserWithProfileDto | OtpNeedsProfileDto> {
    const normalizedMobile = this.otpService.normalizeMobile(dto.mobile)

    // Verify OTP code — throws on failure
    await this.otpService.verifyOtp(normalizedMobile, dto.code)

    // Find existing user
    let user = await this.prisma.user.findUnique({
      where: { mobile: normalizedMobile },
      include: { profile: true },
    })

    if (user) {
      // ── Existing user flow ──

      // Reject disabled/suspended accounts
      this.assertAccountActive(user.status as UserStatus, user.deletedAt)

      // Activate PENDING account (admin-created with no password)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userAny = user as any
      const needsActivation = user.status === UserStatus.PENDING || !userAny.activatedAt
      if (needsActivation) {
        const activated = await (this.prisma.user.update as unknown as (args: unknown) => Promise<typeof user>)({
          where: { id: user.id },
          data: {
            status: UserStatus.ACTIVE,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activatedAt: (user as any).activatedAt ?? new Date(),
          },
          include: { profile: true },
        })
        if (activated) user = activated
        this.logger.log(`OTP activation: user ${user!.id} (${user!.mobile}) activated via OTP`)
      }

      await this.issueTokenPair(user!.id, user!.role as string, user!.status as string, res)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.toUserWithProfileDto(user as any)
    }

    // ── New user flow ──

    // Require profile data to create account
    if (!dto.firstName || !dto.lastName) {
      return {
        needsProfile: true,
        mobile: normalizedMobile,
        message: 'برای ساخت حساب، نام و نام خانوادگی خود را وارد کنید.',
      }
    }

    // Prevent duplicate (race condition guard)
    const doubleCheck = await this.prisma.user.findUnique({ where: { mobile: normalizedMobile } })
    if (doubleCheck) {
      throw new ConflictException('این شماره موبایل قبلاً ثبت شده است')
    }

    if (dto.email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (emailExists) {
        throw new ConflictException('این ایمیل قبلاً ثبت شده است')
      }
    }

    // Create User + Profile (no password — OTP-only account)
    const newUser = await (this.prisma.user.create as unknown as (args: unknown) => Promise<{
      id: string; email: string | null; mobile: string; role: string; status: string; createdAt: Date;
      profile: { id: string; userId: string; firstName: string; lastName: string; avatarUrl: string | null; city: string | null; telegramHandle: string | null } | null
    }>)({
      data: {
        mobile: normalizedMobile,
        email: dto.email ?? null,
        passwordHash: null,
        role: UserRole.APPLICANT,
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
      include: { profile: true },
    })

    // Create Applicant CRM record so staff can track and follow up
    try {
      await this.prisma.applicant.create({
        data: {
          fullName: `${dto.firstName} ${dto.lastName}`,
          mobile: normalizedMobile,
          email: dto.email ?? null,
          source: 'WEBSITE',
          createdById: newUser.id,
        },
      })
    } catch (err) {
      this.logger.warn(`Could not create Applicant record for OTP user ${newUser.id}: ${(err as Error).message}`)
    }

    await this.issueTokenPair(newUser.id, newUser.role as string, newUser.status as string, res)
    this.logger.log(`New OTP registration: ${newUser.mobile} (${newUser.id})`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.toUserWithProfileDto(newUser as any)
  }

  // ─── Refresh ────────────────────────────────────────────────────────────

  async refresh(refreshToken: string | undefined, res: Response): Promise<{ ok: boolean }> {
    if (!refreshToken) {
      throw new UnauthorizedException('توکن بازنشانی یافت نشد')
    }

    let payload: { sub: string }
    try {
      const secret = this.config.get('JWT_REFRESH_SECRET', { infer: true })!
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, { secret })
    } catch {
      throw new UnauthorizedException('توکن بازنشانی نامعتبر است')
    }

    // Verify the hashed RT in Redis
    const storedHash = await this.redis.get(rtKey(payload.sub))
    if (!storedHash) {
      throw new UnauthorizedException('نشست منقضی شده است. لطفاً دوباره وارد شوید.')
    }

    const rtValid = await bcrypt.compare(refreshToken, storedHash)
    if (!rtValid) {
      // Possible token reuse attack — invalidate session entirely
      await this.redis.del(rtKey(payload.sub))
      throw new UnauthorizedException('توکن بازنشانی نامعتبر است')
    }

    // Fetch fresh user data — status could have changed since token was issued
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد')
    }

    this.assertAccountActive(user.status as UserStatus, user.deletedAt)

    await this.issueTokenPair(user.id, user.role as string, user.status as string, res)
    return { ok: true }
  }

  // ─── Logout ─────────────────────────────────────────────────────────────

  async logout(userId: string, res: Response): Promise<void> {
    await this.redis.del(rtKey(userId))
    this.clearCookies(res)
  }

  // ─── Me ─────────────────────────────────────────────────────────────────

  async getMe(currentUser: CurrentUser): Promise<UserWithProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { profile: true },
    })

    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد')
    }

    return this.toUserWithProfileDto(user)
  }

  // ─── Change password ─────────────────────────────────────────────────────

  async changePassword(
    currentUser: CurrentUser,
    dto: ChangePasswordDto,
    res: Response,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } })
    if (!user || !user.passwordHash) {
      throw new InternalServerErrorException('کاربر یافت نشد')
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash)
    if (!valid) {
      throw new ForbiddenException('رمز عبور فعلی اشتباه است')
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12)
    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash: newHash },
    })

    // Invalidate all existing sessions after password change
    await this.redis.del(rtKey(currentUser.id))
    this.clearCookies(res)
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private assertAccountActive(status: UserStatus, deletedAt: Date | null): void {
    if (deletedAt) {
      throw new ForbiddenException('این حساب کاربری وجود ندارد')
    }
    if (status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('حساب کاربری شما معلق شده است')
    }
    if (status === UserStatus.INACTIVE) {
      throw new ForbiddenException('حساب کاربری شما غیرفعال است')
    }
  }

  private async issueTokenPair(
    userId: string,
    role: string,
    status: string,
    res: Response,
  ): Promise<void> {
    const accessSecret = this.config.get('JWT_ACCESS_SECRET', { infer: true })!
    const refreshSecret = this.config.get('JWT_REFRESH_SECRET', { infer: true })!
    const accessTtl = this.config.get('ACCESS_TOKEN_TTL', { infer: true }) ?? '15m'
    const refreshTtl = this.config.get('REFRESH_TOKEN_TTL', { infer: true }) ?? '7d'

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, role, status },
        { secret: accessSecret, expiresIn: parseTtlToSeconds(accessTtl) },
      ),
      this.jwt.signAsync(
        { sub: userId },
        { secret: refreshSecret, expiresIn: parseTtlToSeconds(refreshTtl) },
      ),
    ])

    // Store hashed RT in Redis — we never store raw tokens
    const rtHash = await bcrypt.hash(refreshToken, 10)
    await this.redis.set(rtKey(userId), rtHash, parseTtlToSeconds(refreshTtl))

    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production'

    res.cookie('irno_at', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: parseTtlToSeconds(accessTtl) * 1000,
      path: '/',
    })

    res.cookie('irno_rt', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: parseTtlToSeconds(refreshTtl) * 1000,
      path: '/api/v1/auth',
    })
  }

  private clearCookies(res: Response): void {
    res.clearCookie('irno_at', { path: '/' })
    res.clearCookie('irno_rt', { path: '/api/v1/auth' })
  }

  // ─── Set / Change password (Phase 11.3) ─────────────────────────────────

  /**
   * PATCH /api/v1/auth/password
   *
   * Two modes:
   *  1. User HAS a password → currentPassword required, verified, then replaced.
   *  2. User has NO password (OTP-only) → can set password without currentPassword.
   *
   * After setting/changing: refresh sessions are invalidated, cookies cleared.
   */
  async setPassword(
    currentUser: CurrentUser,
    dto: SetPasswordDto,
    res: Response,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } })
    if (!user) throw new InternalServerErrorException('کاربر یافت نشد')

    // newPassword and confirmPassword must match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('رمز عبور جدید و تکرار آن یکسان نیستند.')
    }

    const hasPassword = Boolean(user.passwordHash)

    if (hasPassword) {
      // Existing password — currentPassword required
      if (!dto.currentPassword) {
        throw new BadRequestException('برای تغییر رمز عبور، وارد کردن رمز عبور فعلی الزامی است.')
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash!)
      if (!valid) {
        throw new ForbiddenException('رمز عبور فعلی صحیح نیست.')
      }
    }
    // else: no password — allow setting without currentPassword

    const newHash = await bcrypt.hash(dto.newPassword, 12)
    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: newHash,
        // Mark account as activated if not yet set
        ...(!(user as unknown as { activatedAt: Date | null }).activatedAt
          ? { activatedAt: new Date() }
          : {}),
      },
    })

    // Invalidate all refresh sessions after password change
    await this.redis.del(rtKey(currentUser.id))
    this.clearCookies(res)

    return {
      message: hasPassword
        ? 'رمز عبور با موفقیت تغییر کرد.'
        : 'رمز عبور با موفقیت تنظیم شد.',
    }
  }

  private toUserWithProfileDto(
    user: {
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
    },
  ): UserWithProfileDto {
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
