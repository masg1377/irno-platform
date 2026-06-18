import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'node:crypto'
import { RedisService } from '../redis/redis.service'
import { RedisKey } from '../redis/redis-keys'
import { PrismaService } from '../prisma/prisma.service'
import { SecurityLogService } from '../security/security-log.service'

// ─── Identity contract ────────────────────────────────────────────────────────

/**
 * IrnoIdentityClaims — the payload Hub returns to Meetino after SSO exchange.
 *
 * This is the identity contract between Hub (Irno ID) and Meetino.
 * Meetino must not trust arbitrary hubUserId values from its own frontend;
 * it must only accept claims returned by THIS exchange endpoint, authenticated
 * by MEETINO_CLIENT_SECRET.
 */
export interface IrnoIdentityClaims {
  /** Hub user UUID — primary external identity key for Meetino */
  hubUserId: string
  /** Hub student UUID — null for staff who are not students */
  hubStudentId: string | null
  /** Display name from Hub profile (firstName + lastName) */
  displayName: string
  /** Mobile number (used as login credential in Hub) */
  mobile: string | null
  /** Email (optional in Hub) */
  email: string | null
  /**
   * Hub role string: SUPER_ADMIN | ADMIN | ACCOUNTANT | TEACHER | MENTOR | STUDENT | GUEST | LEAD
   * Meetino maps this to its own PlatformRole (ADMIN | HOST | STUDENT).
   */
  role: string
  /** App keys the user has access to — currently derived from role */
  appAccess: string[]
  issuedAt: string
  expiresAt: string
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * MeetinoSsoService — Hub-side SSO token generation and exchange.
 *
 * Architecture (SSO-style Irno ID handoff, OIDC-ready):
 *
 *   1. Authenticated Hub user calls POST /sso/code { redirectUri }
 *      → Hub generates a random one-time code, stores identity claims in Redis (TTL ~60s)
 *      → Hub web route handler /sso/meetino redirects to <redirectUri>?code=<code>
 *
 *   2. Meetino backend calls POST /sso/exchange { code, clientSecret }
 *      → Hub validates clientSecret (MEETINO_CLIENT_SECRET), deletes code (one-time)
 *      → Returns IrnoIdentityClaims
 *
 * Security properties:
 *   - Codes are 32 random bytes (base64url, ~256 bits of entropy)
 *   - One-time: deleted from Redis on exchange
 *   - Short-lived: configurable TTL (default 60s)
 *   - Server-to-server: exchange requires MEETINO_CLIENT_SECRET
 *   - redirect_uri validated against explicit whitelist
 *   - Client secret compared with constant-time algorithm
 *   - Hub JWT secrets never sent to Meetino
 *
 * Limitations (not full OAuth2/OIDC):
 *   - No authorization_code PKCE
 *   - No token introspection endpoint
 *   - No dynamic client registration
 *   - Single consumer (Meetino) hardcoded
 *   Future: extend to full OIDC provider when multiple apps need SSO.
 */
@Injectable()
export class MeetinoSsoService {
  private readonly logger = new Logger(MeetinoSsoService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly securityLog: SecurityLogService,
  ) {}

  // ── Config accessors ────────────────────────────────────────────────────────

  private get clientSecret(): string | undefined {
    return this.config.get<string>('MEETINO_CLIENT_SECRET')
  }

  private get codeTtlSeconds(): number {
    const raw = this.config.get<string | number>('MEETINO_SSO_CODE_TTL_SECONDS')
    const n = parseInt(String(raw ?? '60'), 10)
    return isNaN(n) || n < 10 ? 60 : Math.min(n, 300) // clamp 10–300s
  }

  private get allowedRedirectUrls(): string[] {
    const raw = this.config.get<string>('MEETINO_ALLOWED_REDIRECT_URLS') ?? ''
    return raw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Validate a redirect URI against the whitelist.
   * Only the base URL (scheme + host + path) is compared — callers may append
   * query params (e.g., returnTo) without breaking validation.
   */
  validateRedirectUri(redirectUri: string, callerIp?: string): void {
    if (!redirectUri) throw new BadRequestException('redirect_uri is required')

    let parsed: URL
    try {
      parsed = new URL(redirectUri)
    } catch {
      if (callerIp) {
        this.securityLog.ssoAbuse({ ip: callerIp, reason: 'invalid_redirect_uri_format', redirectUri })
      }
      throw new BadRequestException('redirect_uri is not a valid URL')
    }

    // Reject open-redirect attempts (must be http or https, not javascript: etc.)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      if (callerIp) {
        this.securityLog.ssoAbuse({ ip: callerIp, reason: 'redirect_uri_bad_protocol', redirectUri })
      }
      throw new BadRequestException('redirect_uri must use http or https')
    }

    const incomingBase = `${parsed.origin}${parsed.pathname}`

    const allowed = this.allowedRedirectUrls
    if (allowed.length === 0) {
      this.logger.warn(
        'MEETINO_ALLOWED_REDIRECT_URLS not configured — rejecting all SSO redirects',
      )
      throw new BadRequestException('SSO redirect URLs not configured on this server')
    }

    const match = allowed.some((u) => {
      try {
        const a = new URL(u)
        return `${a.origin}${a.pathname}` === incomingBase
      } catch {
        return false
      }
    })

    if (!match) {
      this.logger.warn(`SSO redirect_uri rejected: ${incomingBase}`)
      if (callerIp) {
        this.securityLog.ssoAbuse({ ip: callerIp, reason: 'redirect_uri_not_allowlisted', redirectUri })
      }
      throw new BadRequestException('redirect_uri is not in the allowed list')
    }
  }

  /**
   * Generate a short-lived one-time SSO code for the authenticated Hub user.
   * The caller (Hub web route handler) will append ?code=<code> to the redirect_uri.
   */
  async generateCode(userId: string, redirectUri: string, callerIp?: string): Promise<string> {
    this.validateRedirectUri(redirectUri, callerIp)

    // Fetch user + profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user) throw new UnauthorizedException('User not found')

    // Look up student record (optional — staff may not have one)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = await (this.prisma as any).student
      ?.findFirst({ where: { userId }, select: { id: true } })
      .catch(() => null) as { id: string } | null

    const ttl = this.codeTtlSeconds
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl * 1000)

    const displayName =
      user.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
        : user.mobile

    const claims: IrnoIdentityClaims = {
      hubUserId: user.id,
      hubStudentId: student?.id ?? null,
      displayName,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      appAccess: this.deriveAppAccess(user.role),
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    const code = randomBytes(32).toString('base64url')
    await this.redis.set(RedisKey.ssoCode(code), JSON.stringify(claims), ttl)

    this.logger.log(`SSO code generated — userId=${userId} ttl=${ttl}s`)
    return code
  }

  /**
   * Exchange an SSO code for identity claims.
   * Called server-to-server by Meetino. One-time — deletes code after retrieval.
   */
  async exchangeCode(code: string, clientSecret: string, callerIp?: string): Promise<IrnoIdentityClaims> {
    const expected = this.clientSecret
    if (!expected) {
      this.logger.error('MEETINO_CLIENT_SECRET not set — SSO exchange refused')
      throw new BadRequestException('SSO not configured on this server')
    }

    // Constant-time comparison
    if (!this.constantTimeEqual(clientSecret, expected)) {
      this.logger.warn('SSO exchange: invalid client secret')
      if (callerIp) {
        this.securityLog.ssoAbuse({ ip: callerIp, reason: 'invalid_client_secret' })
      }
      throw new UnauthorizedException('Invalid client secret')
    }

    const raw = await this.redis.get(RedisKey.ssoCode(code))
    if (!raw) {
      if (callerIp) {
        this.securityLog.ssoAbuse({ ip: callerIp, reason: 'sso_code_not_found_or_expired' })
      }
      throw new UnauthorizedException('SSO code not found or expired')
    }

    // Delete immediately — one-time use
    await this.redis.del(RedisKey.ssoCode(code))

    let claims: IrnoIdentityClaims
    try {
      claims = JSON.parse(raw) as IrnoIdentityClaims
    } catch {
      throw new UnauthorizedException('SSO code payload corrupted')
    }

    this.logger.log(`SSO code exchanged — hubUserId=${claims.hubUserId}`)
    return claims
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Constant-time string comparison (prevents timing side-channels). */
  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still run a dummy compare to make timing consistent
      let dummy = 0
      for (let i = 0; i < Math.max(a.length, b.length); i++) dummy |= 0
      return false
    }
    let diff = 0
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
  }

  /**
   * Map Hub role to the list of app keys the user can access.
   * Simple role-based access for MVP — extend with AppModule DB lookup later.
   *
   * APPLICANT = publicly self-registered user.
   * Can access Meetino (maps to STUDENT role there) to join meetings.
   * Cannot access IRNO_HUB admin panel.
   */
  private deriveAppAccess(role: string): string[] {
    const staffRoles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'MENTOR']
    if (staffRoles.includes(role)) {
      return ['MEETINO', 'IRNO_HUB']
    }
    if (role === 'STUDENT' || role === 'APPLICANT') {
      return ['MEETINO']
    }
    return []
  }
}
