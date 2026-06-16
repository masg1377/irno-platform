import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { PlatformRole } from '@irno/meetino-shared';

// ── Identity contract (mirrors IrnoIdentityClaims from Hub) ──────────────────

interface IrnoIdentityClaims {
  hubUserId: string;
  hubStudentId: string | null;
  displayName: string;
  mobile: string | null;
  email: string | null;
  role: string;
  appAccess: string[];
  issuedAt: string;
  expiresAt: string;
}

// ── Return type ────────────────────────────────────────────────────────────────

export interface SsoLoginResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: { id: string; displayName: string; role: PlatformRole };
  /** Internal — controller uses this to set the HttpOnly refresh cookie. */
  refreshTokenRaw: string;
  refreshTokenExpiresAt: Date;
}

// ── Hub role → Meetino PlatformRole mapping ───────────────────────────────────

/**
 * Maps Hub roles to Meetino PlatformRoles.
 *
 * SUPER_ADMIN / ADMIN → ADMIN (can manage meetings, kick users, etc.)
 * TEACHER / MENTOR / ACCOUNTANT → HOST (can create and host meetings)
 * STUDENT → STUDENT
 * GUEST / LEAD / unknown → STUDENT (minimal permissions)
 */
function mapHubRoleToMeetino(hubRole: string): PlatformRole {
  switch (hubRole) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'ADMIN';
    case 'TEACHER':
    case 'MENTOR':
    case 'ACCOUNTANT':
      return 'HOST';
    case 'STUDENT':
      return 'STUDENT';
    default:
      return 'STUDENT';
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * IrnoSsoService — Meetino-side consumer of the Irno ID SSO handoff.
 *
 * Responsibilities:
 *   1. Exchange a one-time SSO code with Hub API (server-to-server)
 *   2. Find or create a local Meetino User record linked to hubUserId
 *   3. Update identity fields if claims changed (display name, role, etc.)
 *   4. Issue a Meetino access + refresh token pair via AuthService
 *
 * Security rules:
 *   - Hub API URL and client secret are server-side env vars (never browser-visible)
 *   - The code is sent by Meetino backend, not by the browser
 *   - Browser only sees the Meetino access/refresh tokens, not Hub tokens
 *   - hubUserId returned by Hub is trusted; arbitrary hubUserId from frontend is NOT
 *
 * Legacy Meetino accounts:
 *   - Existing email+password users are preserved
 *   - If a Hub user's email matches a legacy Meetino user, the two are linked
 *     on first SSO login (hubUserId is populated on the existing row)
 *   - Legacy accounts can still log in via email+password as a fallback
 */
@Injectable()
export class IrnoSsoService {
  private readonly logger = new Logger(IrnoSsoService.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  // ── Config accessors ────────────────────────────────────────────────────────

  private get irnoHubApiUrl(): string {
    return this.config.get('irnoHub', { infer: true }).apiUrl;
  }

  private get irnoClientSecret(): string {
    return this.config.get('irnoHub', { infer: true }).clientSecret;
  }

  get isEnabled(): boolean {
    return this.config.get('irnoHub', { infer: true }).ssoEnabled;
  }

  get hubWebUrl(): string {
    return this.config.get('irnoHub', { infer: true }).webUrl;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Exchange SSO code with Hub, find/create local user, issue Meetino session.
   * Called by IrnoSsoController — never called from browser JS directly.
   *
   * Returns the Meetino access token + internal refresh token fields.
   * Controller is responsible for setting the refresh cookie.
   */
  async exchangeAndLogin(
    code: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<SsoLoginResult> {
    if (!this.isEnabled) {
      throw new BadRequestException('Irno SSO is not enabled on this server');
    }

    // 1. Exchange code with Hub API (server-to-server)
    const claims = await this.fetchClaims(code);

    // 2. Find or create the local Meetino user
    const user = await this.findOrCreateUser(claims);

    // 3. Issue a Meetino session via AuthService
    const { authResponse, refreshTokenRaw, refreshTokenExpiresAt } =
      await this.auth.issueTokensForUser(user, meta);

    return {
      accessToken: authResponse.accessToken,
      accessTokenExpiresIn: authResponse.accessTokenExpiresIn,
      user: authResponse.user, // full PublicUser — includes email, createdAt, role
      // Internal: caller sets refresh cookie — never sent to browser as JSON
      refreshTokenRaw,
      refreshTokenExpiresAt,
    };
  }

  // ── Private: Hub exchange ───────────────────────────────────────────────────

  private async fetchClaims(code: string): Promise<IrnoIdentityClaims> {
    const endpoint = `${this.irnoHubApiUrl.replace(/\/$/, '')}/api/v1/integrations/meetino/sso/exchange`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientSecret: this.irnoClientSecret,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      this.logger.error(`Hub SSO exchange unreachable: ${(err as Error).message}`);
      throw new BadRequestException('Cannot reach Irno Hub. Please try again.');
    }

    if (res.status === 401) {
      throw new UnauthorizedException('SSO code expired or invalid');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Hub SSO exchange error ${res.status}: ${body}`);
      throw new BadRequestException('SSO exchange failed');
    }

    // Hub API wraps all responses in { data: <payload> } via ResponseInterceptor.
    // Unwrap if present, fall back to raw body for forward-compatibility.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const envelope = (await res.json()) as any;
    const data: Partial<IrnoIdentityClaims> = envelope?.data ?? envelope;

    if (!data.hubUserId || !data.displayName || !data.role) {
      throw new BadRequestException('Hub returned incomplete identity claims');
    }

    return data as IrnoIdentityClaims;
  }

  // ── Private: User resolution ────────────────────────────────────────────────

  /**
   * Find or create a Meetino user from Hub identity claims.
   *
   * Priority:
   *   1. Find by hubUserId (returning SSO user)
   *   2. Find by email (existing legacy account — link it)
   *   3. Create new account (first SSO login)
   */
  private async findOrCreateUser(
    claims: IrnoIdentityClaims,
  ): Promise<{ id: string; email: string; role: PlatformRole; displayName: string; isActive: boolean }> {
    const meetinoRole = mapHubRoleToMeetino(claims.role);
    const now = new Date();

    /**
     * Prisma client does not know about the new Phase 9.1 fields until
     * `npx prisma generate` is run after migration. Use `any` casts to
     * access them — the same pattern Hub uses for newly-migrated models.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;

    // Path 1: already linked by hubUserId
    // Note: Prisma client field names are camelCase (mapped from DB snake_case via @map).
    // The generated client doesn't know these fields yet — `any` cast bypasses type check.
    const byHubId = claims.hubUserId
      ? await db.user.findUnique({ where: { hubUserId: claims.hubUserId } })
      : null;

    if (byHubId) {
      await db.user.update({
        where: { id: byHubId.id },
        data: {
          displayName: claims.displayName,
          hubStudentId: claims.hubStudentId,
          roleFromHub: claims.role,
          lastIdentitySyncAt: now,
          ...(mapHubRoleToMeetino(claims.role) !== byHubId.role ? { role: meetinoRole } : {}),
        },
      });
      return { ...byHubId, role: meetinoRole };
    }

    // Path 2: existing account with matching email — link it
    if (claims.email) {
      const byEmail = await this.users.findByEmail(claims.email);
      if (byEmail) {
        this.logger.log(
          `Linking legacy Meetino account ${byEmail.id} to Hub user ${claims.hubUserId}`,
        );
        await db.user.update({
          where: { id: byEmail.id },
          data: {
            externalIdentityProvider: 'IRNO_ID',
            hubUserId: claims.hubUserId,
            hubStudentId: claims.hubStudentId,
            roleFromHub: claims.role,
            role: meetinoRole,
            displayName: claims.displayName,
            lastIdentitySyncAt: now,
          },
        });
        return { ...byEmail, role: meetinoRole };
      }
    }

    // Path 3: create a new Meetino account
    this.logger.log(`Creating new Meetino account for Hub user ${claims.hubUserId}`);
    const email = claims.email ?? this.syntheticEmail(claims.hubUserId);
    const newUser = await db.user.create({
      data: {
        email,
        passwordHash: await this.unusablePasswordHash(),
        displayName: claims.displayName,
        role: meetinoRole,
        isActive: true,
        emailVerified: !!claims.email,
        externalIdentityProvider: 'IRNO_ID',
        hubUserId: claims.hubUserId,
        hubStudentId: claims.hubStudentId,
        roleFromHub: claims.role,
        lastIdentitySyncAt: now,
      },
    }) as { id: string; email: string; role: PlatformRole; displayName: string; isActive: boolean };
    return newUser;
  }

  /**
   * Generate a synthetic email for Hub users who have no email.
   * Uses hub_<uuid>@irno.internal format — not a real address, not user-visible.
   */
  private syntheticEmail(hubUserId: string): string {
    return `hub_${hubUserId}@irno.internal`;
  }

  /**
   * Generate an unusable password hash for SSO-only accounts.
   * The hash starts with an invalid prefix that argon2 will never match —
   * ensuring the account cannot be used with email+password login.
   */
  private async unusablePasswordHash(): Promise<string> {
    const { randomBytes } = await import('node:crypto');
    return `IRNO_SSO_ONLY:${randomBytes(16).toString('hex')}`;
  }
}
