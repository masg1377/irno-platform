import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { CareerService } from './career.service'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { CreatePortfolioProjectDto } from './dto/create-portfolio-project.dto'
import { UpdatePortfolioProjectDto } from './dto/update-portfolio-project.dto'
import { ReorderPortfolioProjectsDto } from './dto/reorder-portfolio-projects.dto'
import type { CurrentUser } from '@irno/types'

/**
 * PortfolioController — portfolio project management.
 *
 * Base path: /api/v1/career/portfolio/projects
 */
@Controller('career/portfolio/projects')
export class PortfolioController {
  constructor(private readonly careerService: CareerService) {}

  @Get()
  async listProjects(
    @CurrentUserDec() user: CurrentUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.careerService.listPortfolioProjects(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
  }

  @Post()
  async createProject(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: CreatePortfolioProjectDto,
  ) {
    const profile = await this.careerService.getOrCreateCareerProfile(user.id)
    return this.careerService.createPortfolioProject(user.id, profile.id, dto)
  }

  /**
   * POST /api/v1/career/portfolio/projects/reorder
   * Reorder portfolio projects. Declared before /:id to avoid route conflict.
   */
  @Post('reorder')
  async reorderProjects(
    @CurrentUserDec() user: CurrentUser,
    @Body() dto: ReorderPortfolioProjectsDto,
  ) {
    return this.careerService.reorderPortfolioProjects(user.id, dto.items)
  }

  /**
   * GET /api/v1/career/portfolio/projects/:id
   * Get a single portfolio project by ID (ownership enforced).
   * Declared AFTER /reorder to avoid route conflict.
   */
  @Get(':id')
  async getProject(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.careerService.getPortfolioProject(user.id, id)
  }

  @Patch(':id')
  async updateProject(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioProjectDto,
  ) {
    return this.careerService.updatePortfolioProject(id, user.id, dto)
  }

  /**
   * PATCH /api/v1/career/portfolio/projects/:id/featured
   * Toggle featured status of a portfolio project.
   */
  @Patch(':id/featured')
  async toggleFeatured(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
    @Body('isFeatured') isFeatured: boolean,
  ) {
    return this.careerService.togglePortfolioProjectFeatured(id, user.id, isFeatured)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProject(
    @CurrentUserDec() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.careerService.deletePortfolioProject(id, user.id)
  }
}
