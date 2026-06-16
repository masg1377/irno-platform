import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import type { CurrentUser } from '@irno/types'
import { UserRole, UserStatus } from '@irno/types'

/**
 * Users controller — requires ADMIN or SUPER_ADMIN for all routes.
 * Role enforcement is handled by @Roles() combined with the global RolesGuard.
 */
@Controller('users')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * List users with optional search/filter/pagination.
   */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.usersService.findAll({ search, role, status, page, limit })
  }

  /**
   * GET /api/v1/users/:id
   * Get a single user with profile.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  /**
   * POST /api/v1/users
   * Create a new user (staff or student).
   */
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUserDec() actor: CurrentUser) {
    return this.usersService.create(dto, actor)
  }

  /**
   * PATCH /api/v1/users/:id
   * Update user fields or profile.
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.usersService.update(id, dto, actor)
  }

  /**
   * DELETE /api/v1/users/:id
   * Soft-delete a user (sets deletedAt).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUserDec() actor: CurrentUser) {
    return this.usersService.remove(id, actor)
  }
}
