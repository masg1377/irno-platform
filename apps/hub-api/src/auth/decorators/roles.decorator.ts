import { SetMetadata } from '@nestjs/common'
import type { UserRole } from '@irno/types'

export const ROLES_KEY = 'roles'

/**
 * Restrict a route to specific roles.
 * Must be combined with RolesGuard (applied after JwtAuthGuard confirms identity).
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Get('users')
 * findAll() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
