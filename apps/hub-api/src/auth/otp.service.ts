import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import type { ApiEnv } from '@irno/validators'

/** Regex to strip Iranian country code prefix */
const MOBILE_NORMALIZE_RE = /^(\+98|98)/

/**
 * Normalise Iranian mobile numbers to 09xxxxxxxxx format.
 * +989123456789 → 09123456789
 */
function normalizeMobile(mobile: string): string {
  return mobile.replace(MOBILE_NORMALIZE_RE, '0')
}

/**
 * Generate a cryptographically random 6-digit OTP string.
 */
function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000)
  return String(n).padStart(6, '0')
}

/**
 * OtpService — OTP lifecycle management (create, verify, rate-limit).
 *
 * Responsibilities:
 *  - Generate and hash OTP codes (raw code never stored)
 *  - Enforce resend cooldown and attempt limits
 *  - Verify submitted codes
 *
 * NOT responsible for SMS/push delivery. The caller (AuthService) sends
 * the code via SmsService from NotificationsModule.
 *
 * Security guarantees:
 *  - Raw OTP never stored in DB (bcrypt hash only)
 *  - One-time use (consumedAt set on successful verification)
 *  - Expires after OTP_TTL_SECONDS
 *  - Rate-limited: OTP_RESEND_COOLDOWN_SECONDS between requests per mobile
 *  - Locked: OTP_MAX_ATTEMPTS wrong codes invalidates the OTP
 *  - No enumeration: responses never reveal whether mobile is registered
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnv>,
  ) {}

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Create and store a new OTP for the given mobile number.
   *
   * Rate limits enforced:
   * - Resend cooldown: reject if an active (unconsumed + not expired) OTP exists
   *   that was created within OTP_RESEND_COOLDOWN_SECONDS.
   *
   * Returns the raw 6-digit code (for delivery by caller) and cooldown info.
   * The caller is responsible for sending the code via SmsService.
   */
  async createOtp(
    mobile: string,
    purpose: string = 'LOGIN',
    userId?: string,
  ): Promise<{ code: string; cooldownSeconds: number }> {
    const normalizedMobile = normalizeMobile(mobile)
    const ttl = this.config.get('OTP_TTL_SECONDS', { infer: true }) ?? 120
    const cooldown = this.config.get('OTP_RESEND_COOLDOWN_SECONDS', { infer: true }) ?? 60
    const maxAttempts = this.config.get('OTP_MAX_ATTEMPTS', { infer: true }) ?? 5

    // Check resend cooldown: find the most recent active OTP for this mobile
    const recent = await (this.prisma as unknown as {
      otpCode: { findFirst: (args: unknown) => Promise<{ createdAt: Date } | null> }
    }).otpCode.findFirst({
      where: {
        mobile: normalizedMobile,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    if (recent) {
      const elapsed = Math.floor((Date.now() - recent.createdAt.getTime()) / 1000)
      const remaining = cooldown - elapsed
      if (remaining > 0) {
        throw new HttpException(
          { cooldownSeconds: remaining, message: `لطفاً ${remaining} ثانیه صبر کنید.` },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    const code = generateOtpCode()
    const codeHash = await bcrypt.hash(code, 10)
    const expiresAt = new Date(Date.now() + ttl * 1000)

    await (this.prisma as unknown as {
      otpCode: { create: (args: unknown) => Promise<unknown> }
    }).otpCode.create({
      data: {
        mobile: normalizedMobile,
        userId: userId ?? null,
        codeHash,
        purpose,
        expiresAt,
        maxAttempts,
      },
    })

    this.logger.debug(`OTP created for mobile=${normalizedMobile} purpose=${purpose} ttl=${ttl}s`)

    return { code, cooldownSeconds: cooldown }
  }

  /**
   * Verify an OTP code for the given mobile.
   *
   * On success: marks the OTP consumed and returns the userId if the OTP was
   * linked to a user (admin-created account), or null for new-user flow.
   *
   * Throws:
   * - BadRequestException code 'INVALID_CODE' — wrong code
   * - BadRequestException code 'EXPIRED_CODE' — OTP expired
   * - BadRequestException code 'TOO_MANY_ATTEMPTS' — attempt limit reached
   * - BadRequestException code 'NO_OTP_FOUND' — no active OTP for mobile
   */
  async verifyOtp(mobile: string, code: string): Promise<{ otpId: string; userId: string | null }> {
    const normalizedMobile = normalizeMobile(mobile)

    const otp = await (this.prisma as unknown as {
      otpCode: {
        findFirst: (args: unknown) => Promise<{
          id: string
          codeHash: string
          expiresAt: Date
          consumedAt: Date | null
          attempts: number
          maxAttempts: number
          userId: string | null
        } | null>
        update: (args: unknown) => Promise<unknown>
      }
    }).otpCode.findFirst({
      where: {
        mobile: normalizedMobile,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      throw new BadRequestException({ code: 'NO_OTP_FOUND', message: 'کد تأییدی برای این شماره موبایل یافت نشد.' })
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'EXPIRED_CODE', message: 'کد منقضی شده است. کد جدید درخواست کنید.' })
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException({ code: 'TOO_MANY_ATTEMPTS', message: 'تعداد تلاش‌های مجاز تمام شده است. کد جدید درخواست کنید.' })
    }

    const prismaOtpCode = (this.prisma as unknown as {
      otpCode: { update: (args: unknown) => Promise<unknown> }
    }).otpCode

    const isValid = await bcrypt.compare(code, otp.codeHash)

    if (!isValid) {
      const newAttempts = otp.attempts + 1
      const shouldInvalidate = newAttempts >= otp.maxAttempts

      await prismaOtpCode.update({
        where: { id: otp.id },
        data: {
          attempts: newAttempts,
          ...(shouldInvalidate ? { consumedAt: new Date() } : {}),
        },
      })

      if (shouldInvalidate) {
        throw new BadRequestException({ code: 'TOO_MANY_ATTEMPTS', message: 'تعداد تلاش‌های مجاز تمام شده است. کد جدید درخواست کنید.' })
      }

      throw new BadRequestException({ code: 'INVALID_CODE', message: 'کد وارد‌شده اشتباه است.' })
    }

    await prismaOtpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })

    return { otpId: otp.id, userId: otp.userId }
  }

  /**
   * Normalise a mobile number for consistent storage/lookup.
   * Exposed so AuthService can use the same normalisation.
   */
  normalizeMobile(mobile: string): string {
    return normalizeMobile(mobile)
  }
}
