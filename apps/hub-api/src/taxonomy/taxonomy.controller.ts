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
import { TaxonomyService } from './taxonomy.service'
import { CreateTaxonomyTermDto } from './dto/create-taxonomy-term.dto'
import { UpdateTaxonomyTermDto } from './dto/update-taxonomy-term.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, TaxonomyTermType, TaxonomyTermStatus } from '@irno/types'

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  /**
   * GET /api/v1/taxonomy
   * List taxonomy terms (staff read).
   */
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.MENTOR,
  )
  list(
    @Query('type') type?: TaxonomyTermType,
    @Query('status') status?: TaxonomyTermStatus,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.taxonomyService.list({
      type,
      status,
      search,
      parentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    })
  }

  /**
   * POST /api/v1/taxonomy
   * Create a new taxonomy term (admin only).
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateTaxonomyTermDto) {
    return this.taxonomyService.create(dto)
  }

  /**
   * GET /api/v1/taxonomy/:id
   * Get taxonomy term by ID.
   */
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.MENTOR,
  )
  findById(@Param('id') id: string) {
    return this.taxonomyService.findById(id)
  }

  /**
   * PATCH /api/v1/taxonomy/:id
   * Update taxonomy term (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTaxonomyTermDto) {
    return this.taxonomyService.update(id, dto)
  }

  /**
   * DELETE /api/v1/taxonomy/:id
   * Soft delete (archive) a taxonomy term (admin only).
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.taxonomyService.delete(id)
  }
}
