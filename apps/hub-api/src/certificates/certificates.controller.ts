import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common'
import { Roles } from '../auth/decorators/roles.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { UserRole } from '@irno/types'
import { CertificatesService } from './certificates.service'
import { CertificateRenderService } from './certificate-render.service'
import { IssueCertificateDto } from './dto/issue-certificate.dto'
import { RevokeCertificateDto } from './dto/revoke-certificate.dto'
import type { Request, Response } from 'express'

const ALL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.TEACHER,
  UserRole.MENTOR,
  UserRole.ACCOUNTANT,
  UserRole.STUDENT,
  UserRole.APPLICANT,
  UserRole.GUEST,
  UserRole.LEAD,
]

@Controller()
export class CertificatesController {
  constructor(
    private readonly svc: CertificatesService,
    private readonly render: CertificateRenderService,
  ) {}

  // ── Admin: student certificate management ─────────────────

  @Get('students/:studentId/certificates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  listStudentCerts(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.svc.listStudentCertificates(studentId)
  }

  @Post('students/:studentId/certificates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  issueCert(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: IssueCertificateDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.svc.issueCertificate(studentId, dto, req.user.id)
  }

  @Patch('students/:studentId/certificates/:id/revoke')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  revokeCert(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeCertificateDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.svc.revokeCertificate(studentId, id, req.user.id, dto)
  }

  @Get('students/:studentId/certificates/:id/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.MENTOR)
  async adminCertPdf(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const certs = (await this.svc.listStudentCertificates(studentId)) as any[]
    const cert = certs.find((c: any) => c.id === id)
    if (!cert) {
      res.status(404).json({ message: 'مدرک یافت نشد' })
      return
    }
    const db = (this.svc as any).db
    const student = await db.student.findFirst({
      where: { id: studentId },
      include: { user: { include: { profile: true } } },
    })
    const profile = student?.user?.profile
    const studentDisplayName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : 'دانشجو'
    const html = this.render.renderHtml({ ...cert, studentDisplayName })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${cert.certificateNumber}.html"`,
    )
    res.send(html)
  }

  // ── Portal: own certificates ──────────────────────────────

  @Get('portal/certificates')
  @Roles(...ALL_ROLES)
  portalCerts(@Req() req: Request & { user: { id: string } }) {
    return this.svc.getCertificateForPortal(req.user.id)
  }

  @Get('portal/certificates/:id/pdf')
  @Roles(...ALL_ROLES)
  async portalCertPdf(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const cert = (await this.svc.getPortalCertificateById(req.user.id, id)) as any
    const db = (this.svc as any).db
    const student = await db.student.findFirst({
      where: { userId: req.user.id },
      include: { user: { include: { profile: true } } },
    })
    const profile = student?.user?.profile
    const studentDisplayName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : 'دانشجو'
    const html = this.render.renderHtml({ ...cert, studentDisplayName })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${cert.certificateNumber}.html"`,
    )
    res.send(html)
  }

  // ── Public verification ───────────────────────────────────

  @Get('certificates/verify/:code')
  @Public()
  verify(@Param('code') code: string) {
    return this.svc.verifyPublicCertificate(code)
  }
}
