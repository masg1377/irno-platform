import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { ApiEnv } from '@irno/validators'
import type { CurrentUser } from '@irno/types'
import { UserStatus } from '@irno/types'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

/**
 * Global JWT auth guard.
 * Applied via APP_GUARD provider so every route is protected by default.
 * Routes decorated with @Public() bypass verification.
 *
 * Token source: httpOnly cookie `irno_at` (access token).
 * The guard attaches a CurrentUser to request.user — never the raw JWT payload.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() routes through
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request & { user: CurrentUser }>()
    const token = this.extractToken(request)

    if (!token) {
      throw new UnauthorizedException('توکن دسترسی یافت نشد')
    }

    try {
      const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true })!
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string; status: string }>(
        token,
        { secret },
      )

      // Reject if the token belongs to a suspended/deleted user.
      // The status embedded in token is a snapshot — true revocation goes through Redis.
      if (payload.status === UserStatus.SUSPENDED || payload.status === UserStatus.INACTIVE) {
        throw new UnauthorizedException('حساب کاربری شما غیرفعال شده است')
      }

      request.user = {
        id: payload.sub,
        role: payload.role as CurrentUser['role'],
        status: payload.status as CurrentUser['status'],
      }
    } catch {
      throw new UnauthorizedException('توکن دسترسی نامعتبر است')
    }

    return true
  }

  private extractToken(request: Request): string | undefined {
    // Primary: httpOnly cookie
    const cookieToken = (request.cookies as Record<string, string>)?.['irno_at']
    if (cookieToken) return cookieToken

    // Fallback: Bearer header (useful for server-side calls / API clients)
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }

    return undefined
  }
}
