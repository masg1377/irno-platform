import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { CurrentUser } from '@irno/types'

/**
 * Extracts the authenticated user from the request object.
 * Populated by JwtAuthGuard after token verification.
 *
 * @example
 * @Get('me')
 * getMe(@CurrentUserDec() user: CurrentUser) { ... }
 */
export const CurrentUserDec = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: CurrentUser }>()
    return request.user
  },
)
