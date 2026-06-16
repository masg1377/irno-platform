import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@irno/types'
import { CertificatesService } from './certificates.service'
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto'
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto'

@Controller('certificate-templates')
export class CertificateTemplatesController {
  constructor(private readonly svc: CertificatesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.listTemplates(+page, +limit, search, type)
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getTemplate(id)
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateCertificateTemplateDto) {
    return this.svc.createTemplate(dto)
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCertificateTemplateDto,
  ) {
    return this.svc.updateTemplate(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTemplate(id)
  }
}
