import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import type { CurrentUser } from '@irno/types'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { UserRole } from '@irno/types'

/**
 * Role-based access guard.
 * Applied on routes that require specific roles (via @Roles() decorator).
 * Must run after JwtAuthGuard has populated request.user.
 *
 * If no @Roles() decorator is present, the route is allowed for all authenticated users.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles() restriction — any authenticated user passes
    if (!requiredRoles || requiredRoles.length === 0) return true

    const request = context.switchToHttp().getRequest<Request & { user: CurrentUser }>()
    const user = request.user

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('شما به این بخش دسترسی ندارید')
    }

    return true
  }
}
