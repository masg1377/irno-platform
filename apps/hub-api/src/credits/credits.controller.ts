import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common'
import { CreditsService } from './credits.service'
import { CreateCreditDto } from './dto/create-credit.dto'
import { UpdateCreditDto } from './dto/update-credit.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, CreditType, CreditStatus } from '@irno/types'

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  /**
   * GET /api/v1/credits
   * List all credits (staff read).
   */
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.MENTOR,
    UserRole.STUDENT,
    UserRole.APPLICANT,
  )
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: CreditType,
    @Query('status') status?: CreditStatus,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.creditsService.findAll({
      search,
      type,
      status,
      categoryId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    })
  }

  /**
   * POST /api/v1/credits
   * Create a new credit type (admin only).
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateCreditDto) {
    return this.creditsService.create(dto)
  }

  /**
   * GET /api/v1/credits/:id
   * Get credit by ID.
   */
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.MENTOR,
    UserRole.STUDENT,
    UserRole.APPLICANT,
  )
  findOne(@Param('id') id: string) {
    return this.creditsService.findOne(id)
  }

  /**
   * PATCH /api/v1/credits/:id
   * Update credit (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCreditDto) {
    return this.creditsService.update(id, dto)
  }

  /**
   * DELETE /api/v1/credits/:id
   * Soft delete (archive) a credit (admin only).
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.creditsService.delete(id)
  }
}
