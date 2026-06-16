import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { StudentsService } from './students.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserDec } from '../auth/decorators/current-user.decorator'
import { UserRole, StudentStatus } from '@irno/types'
import type { CurrentUser } from '@irno/types'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { AddStudentNoteDto } from './dto/add-student-note.dto'

@Controller('students')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // GET /students
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: StudentStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.studentsService.findAll({ search, status, page, limit })
  }

  // GET /students/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findOne(id)
  }

  // POST /students
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateStudentDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.studentsService.create(dto, actor)
  }

  // PATCH /students/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.studentsService.update(id, dto, actor)
  }

  // POST /students/:id/notes
  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddStudentNoteDto,
    @CurrentUserDec() actor: CurrentUser,
  ) {
    return this.studentsService.addNote(id, dto, actor)
  }

  // GET /students/:id/timeline
  @Get(':id/timeline')
  getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('eventType') eventType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.studentsService.getTimeline(id, page, limit, eventType, fromDate, toDate)
  }
}
