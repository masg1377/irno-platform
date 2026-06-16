import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common'
import { CareerService } from './career.service'
import { Public } from '../auth/decorators/public.decorator'

/**
 * RoadmapController — career roadmap endpoints.
 *
 * Base path: /api/v1/career/roadmaps
 */
@Controller('career/roadmaps')
export class RoadmapController {
  constructor(private readonly careerService: CareerService) {}

  /**
   * GET /api/v1/career/roadmaps
   * List published roadmaps (paginated). Requires authentication.
   */
  @Get()
  async listRoadmaps(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.careerService.listRoadmaps(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
  }

  /**
   * GET /api/v1/career/roadmaps/:slug
   * Get a specific roadmap with all nodes. Public — no auth required.
   */
  @Public()
  @Get(':slug')
  async getRoadmap(@Param('slug') slug: string) {
    return this.careerService.getRoadmap(slug)
  }
}
