import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common'
import { IsString, IsUrl, MinLength } from 'class-validator'
import type { Request } from 'express'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@irno/types'
import type { CurrentUser } from '@irno/types'
import { MeetinoSsoService } from './meetino-sso.service'
import { RateLimit } from '../security/rate-limit.decorator'

// ── DTOs ─────────────────────────────────────────────────────────────────────

export class SsoCodeDto {
  @IsString()
  @IsUrl({ require_tld: false }) // allow localhost in dev
  redirectUri!: string
}

export class SsoExchangeDto {
  @IsString()
  @MinLength(8)
  code!: string

  @IsString()
  @MinLength(32)
  clientSecret!: string
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * MeetinoSsoController
 *
 * Implements the Hub side of the SSO-style Irno ID handoff for Meetino.
 *
 * Endpoint 1 — POST /api/v1/integrations/meetino/sso/code
 *   Requires an authenticated Hub user (irno_at cookie).
 *   Returns a short-lived one-time code that Meetino will exchange server-to-server.
 *   The Hub web route handler /sso/meetino calls this then redirects the user.
 *
 * Endpoint 2 — POST /api/v1/integrations/meetino/sso/exchange
 *   Public (no Hub user auth) — called by Meetino API backend.
 *   Validates MEETINO_CLIENT_SECRET, consumes the code, returns IrnoIdentityClaims.
 *   Hub JWT secrets are NEVER included in this response.
 */
@Controller('integrations/meetino/sso')
export class MeetinoSsoController {
  constructor(private readonly sso: MeetinoSsoService) {}

  /**
   * POST /api/v1/integrations/meetino/sso/code
   *
   * Called by Hub web server-side when a logged-in user needs an SSO code for Meetino.
   * All registered roles except GUEST and LEAD can request a code.
   * APPLICANT = publicly self-registered user → maps to STUDENT in Meetino.
   */
  // 20 SSO code requests per 10 minutes per user
  @RateLimit({ key: 'sso-code', max: 20, windowS: 600, keyBy: 'user' })
  @Post('code')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.MENTOR,
    UserRole.STUDENT,
    UserRole.APPLICANT,
  )
  async generateCode(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: SsoCodeDto,
    @Req() req: Request,
  ): Promise<{ code: string }> {
    const ip = this.extractIp(req)
    const code = await this.sso.generateCode(user.id, dto.redirectUri, ip)
    return { code }
  }

  /**
   * POST /api/v1/integrations/meetino/sso/exchange
   *
   * Server-to-server endpoint for Meetino. Public (no Hub user session required).
   * Security is enforced by MEETINO_CLIENT_SECRET, not by Hub user JWT.
   *
   * Do NOT expose this endpoint to browser clients.
   * Do NOT log or return Hub JWT secrets in the response.
   */
  // 30 server-to-server exchange calls per minute per IP (Meetino backend)
  @RateLimit({ key: 'sso-exchange', max: 30, windowS: 60, keyBy: 'ip' })
  @Public()
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeCode(@Body() dto: SsoExchangeDto, @Req() req: Request) {
    const ip = this.extractIp(req)
    return this.sso.exchangeCode(dto.code, dto.clientSecret, ip)
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0]?.trim()
      if (first) return first
    }
    return req.socket?.remoteAddress ?? 'unknown'
  }
}
