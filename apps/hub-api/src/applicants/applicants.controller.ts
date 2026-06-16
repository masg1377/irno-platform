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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common'
import { ApplicantsService } from './applicants.service'
import { CreateApplicantDto } from './dto/create-applicant.dto'
import { UpdateApplicantDto } from './dto/update-applicant.dto'
import { AddApplicantNoteDto } from './dto/add-applicant-note.dto'
import { AssignApplicantDto } from './dto/assign-applicant.dto'
import { ConvertApplicantDto } from './dto/convert-applicant.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import type { CurrentUser } from '@irno/types'
import { UserRole, ApplicantStatus, ApplicantSource } from '@irno/types'

@Controller('applicants')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ApplicantsController {
  constructor(private readonly applicantsService: ApplicantsService) {}

  /**
   * GET /api/v1/applicants
   * List applicants with search/filter/pagination.
   */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: ApplicantStatus,
    @Query('source') source?: ApplicantSource,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('followUpFrom') followUpFrom?: string,
    @Query('followUpTo') followUpTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.applicantsService.findAll({
      search,
      status,
      source,
      assignedToUserId,
      followUpFrom,
      followUpTo,
      page,
      limit,
    })
  }

  /**
   * GET /api/v1/applicants/:id
   * Get applicant details with notes.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicantsService.findOne(id)
  }

  /**
   * POST /api/v1/applicants
   * Create a new applicant.
   */
  @Post()
  create(@Body() dto: CreateApplicantDto, @CurrentUserDec() actor: CurrentUser) {
    return this.applicantsService.create(dto, actor)
  }

  /**
   * PATCH /api/v1/applicants/:id
   * Update applicant fields.
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicantDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.applicantsService.update(id, dto, actor)
  }

  /**
   * DELETE /api/v1/applicants/:id
   * Soft-delete an applicant.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.applicantsService.remove(id)
  }

  /**
   * POST /api/v1/applicants/:id/notes
   * Add a note to an applicant.
   */
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddApplicantNoteDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.applicantsService.addNote(id, dto, actor)
  }

  /**
   * GET /api/v1/applicants/:id/notes
   * List notes for an applicant.
   */
  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.applicantsService.getNotes(id)
  }

  /**
   * PATCH /api/v1/applicants/:id/assign
   * Assign or unassign a staff member.
   */
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignApplicantDto) {
    return this.applicantsService.assign(id, dto)
  }

  /**
   * POST /api/v1/applicants/:id/convert
   * Convert applicant to student — transactional.
   */
  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertApplicantDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.applicantsService.convert(id, dto, actor)
  }
}
