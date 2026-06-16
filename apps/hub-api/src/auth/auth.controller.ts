import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { SetPasswordDto } from './dto/set-password.dto'
import { OtpRequestDto } from './dto/otp-request.dto'
import { OtpVerifyDto } from './dto/otp-verify.dto'
import { Public } from './decorators/public.decorator'
import { CurrentUserDec } from './decorators/current-user.decorator'
import { RateLimit } from '../security/rate-limit.decorator'
import type { CurrentUser } from '@irno/types'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Public — no JWT required.
   * Sets httpOnly cookies irno_at and irno_rt on success.
   */
  // 10 attempts per 15 minutes per IP
  @RateLimit({ key: 'auth-login', max: 10, windowS: 900, keyBy: 'ip' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res)
  }

  /**
   * POST /api/v1/auth/register
   * Public — Irno ID public self-registration.
   * Creates User (APPLICANT role) + Profile + Applicant CRM record.
   * Sets httpOnly cookies on success.
   * Does NOT create Student, Enrollment, or Payment.
   */
  // 5 registrations per hour per IP
  @RateLimit({ key: 'auth-register', max: 5, windowS: 3600, keyBy: 'ip' })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, res)
  }

  /**
   * POST /api/v1/auth/refresh
   * Public — uses irno_rt cookie to issue new token pair.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = (req.cookies as Record<string, string>)?.['irno_rt']
    return this.authService.refresh(rt, res)
  }

  /**
   * POST /api/v1/auth/logout
   * Authenticated — clears cookies and Redis RT hash.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUserDec() user: CurrentUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id, res)
  }

  /**
   * GET /api/v1/auth/me
   * Returns the authenticated user's full profile.
   * Used by hub-web server components to get the current user.
   */
  @Get('me')
  async getMe(@CurrentUserDec() user: CurrentUser) {
    return this.authService.getMe(user)
  }

  /**
   * PATCH /api/v1/auth/password
   * Authenticated — set or change password.
   *
   * - Users with no password (OTP-only): set password without currentPassword.
   * - Users with a password: must provide currentPassword.
   * - Invalidates all refresh sessions on success.
   */
  // 5 password change attempts per hour per user
  @RateLimit({ key: 'auth-password', max: 5, windowS: 3600, keyBy: 'user' })
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.setPassword(user, dto, res)
  }

  /**
   * POST /api/v1/auth/change-password
   * @deprecated Use PATCH /api/v1/auth/password instead.
   * Kept as a backward-compatible alias.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.changePassword(user, dto, res)
  }

  /**
   * POST /api/v1/auth/otp/request
   * Public — send an OTP to the given mobile number.
   * Never reveals whether the mobile is registered.
   * Enforces resend cooldown.
   */
  // 3 OTP requests per 2 minutes per IP (resend cooldown enforced separately in OtpService)
  @RateLimit({ key: 'otp-request', max: 3, windowS: 120, keyBy: 'ip' })
  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async otpRequest(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto)
  }

  /**
   * POST /api/v1/auth/otp/verify
   * Public — verify OTP and log in or create account.
   *
   * On success: sets auth cookies and returns user profile.
   * If new user with no profile data: returns { needsProfile: true }.
   */
  // 10 OTP verify attempts per 10 minutes per IP
  @RateLimit({ key: 'otp-verify', max: 10, windowS: 600, keyBy: 'ip' })
  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async otpVerify(
    @Body() dto: OtpVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp(dto, res)
  }
}
