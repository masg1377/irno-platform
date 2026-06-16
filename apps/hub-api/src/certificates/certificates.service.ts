import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { IssueCertificateDto } from './dto/issue-certificate.dto'
import { RevokeCertificateDto } from './dto/revoke-certificate.dto'
import * as crypto from 'crypto'

@Injectable()
export class CertificatesService {
  private get db() {
    return this.prisma as any
  }

  constructor(private readonly prisma: PrismaService) {}

  // ── Certificate number ────────────────────────────────────

  async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `IRNO-CERT-${year}-`
    const count = await this.db.studentCertificate.count({
      where: { certificateNumber: { startsWith: prefix } },
    })
    const seq = String(count + 1).padStart(6, '0')
    return `${prefix}${seq}`
  }

  generateVerificationCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase()
  }

  // ── Templates ─────────────────────────────────────────────

  async listTemplates(page = 1, limit = 20, search?: string, type?: string, isActive?: boolean) {
    const where: any = { deletedAt: null }
    if (search) where.title = { contains: search, mode: 'insensitive' }
    if (type) where.type = type
    if (isActive !== undefined) where.isActive = isActive
    const [data, total] = await Promise.all([
      this.db.certificateTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.certificateTemplate.count({ where }),
    ])
    return { data: data.map(this.mapTemplate), total, page, limit }
  }

  async getTemplate(id: string) {
    const t = await this.db.certificateTemplate.findFirst({ where: { id, deletedAt: null } })
    if (!t) throw new NotFoundException('قالب مدرک یافت نشد')
    return this.mapTemplate(t)
  }

  async createTemplate(dto: any) {
    const existing = await this.db.certificateTemplate.findFirst({
      where: { slug: dto.slug, deletedAt: null },
    })
    if (existing) throw new ConflictException('این slug قبلاً استفاده شده است')
    const t = await this.db.certificateTemplate.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        type: dto.type,
        language: dto.language ?? 'FA',
        layoutConfig: dto.layoutConfig ?? null,
        isActive: dto.isActive ?? true,
      },
    })
    return this.mapTemplate(t)
  }

  async updateTemplate(id: string, dto: any) {
    await this.getTemplate(id)
    if (dto.slug) {
      const conflict = await this.db.certificateTemplate.findFirst({
        where: { slug: dto.slug, deletedAt: null, id: { not: id } },
      })
      if (conflict) throw new ConflictException('این slug قبلاً استفاده شده است')
    }
    const t = await this.db.certificateTemplate.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    })
    return this.mapTemplate(t)
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id)
    await this.db.certificateTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
    return { message: 'قالب مدرک حذف شد' }
  }

  // ── Student certificates ──────────────────────────────────

  async listStudentCertificates(studentId: string) {
    const certs = await this.db.studentCertificate.findMany({
      where: { studentId },
      orderBy: { issuedAt: 'desc' },
      include: {
        template: { select: { title: true } },
        issuedBy: {
          select: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    })
    return certs.map(this.mapCertificate)
  }

  async issueCertificate(
    studentId: string,
    dto: IssueCertificateDto,
    issuedById: string,
  ) {
    const student = await this.db.student.findFirst({
      where: { id: studentId },
      include: { user: { include: { profile: true } } },
    })
    if (!student) throw new NotFoundException('دانشجو یافت نشد')

    if (dto.sourceType && dto.sourceId) {
      const duplicate = await this.db.studentCertificate.findFirst({
        where: { studentId, sourceType: dto.sourceType, sourceId: dto.sourceId },
      })
      if (duplicate) throw new ConflictException('مدرک مشابهی برای همین منبع قبلاً صادر شده است')
    }

    if (dto.templateId) {
      const tmpl = await this.db.certificateTemplate.findFirst({
        where: { id: dto.templateId, deletedAt: null },
      })
      if (!tmpl) throw new NotFoundException('قالب مدرک یافت نشد')
    }

    const certificateNumber = await this.generateCertificateNumber()
    const verificationCode = this.generateVerificationCode()

    const cert = await this.db.studentCertificate.create({
      data: {
        studentId,
        templateId: dto.templateId ?? null,
        title: dto.title,
        certificateNumber,
        type: dto.type,
        status: 'ACTIVE',
        issuedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        sourceType: dto.sourceType ?? null,
        sourceId: dto.sourceId ?? null,
        issuedById,
        verificationCode,
        publicVerifyEnabled: dto.publicVerifyEnabled ?? true,
        metadata: dto.metadata ?? null,
      },
      include: {
        template: { select: { title: true } },
        issuedBy: {
          select: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    })

    try {
      await this.db.studentTimelineEvent.create({
        data: {
          studentId,
          eventType: 'CERTIFICATE_ISSUED',
          title: 'مدرک صادر شد',
          description: `مدرک "${dto.title}" (${certificateNumber}) صادر شد`,
          metadata: { certificateId: cert.id, certificateNumber },
        },
      })
    } catch {
      // Timeline event may fail if enum not yet in DB — non-fatal
    }

    return this.mapCertificate(cert)
  }

  async revokeCertificate(
    studentId: string,
    certificateId: string,
    revokedById: string,
    dto: RevokeCertificateDto,
  ) {
    const cert = await this.db.studentCertificate.findFirst({
      where: { id: certificateId, studentId },
    })
    if (!cert) throw new NotFoundException('مدرک یافت نشد')
    if (cert.status === 'REVOKED') throw new ConflictException('این مدرک قبلاً لغو شده است')

    const updated = await this.db.studentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById,
        revokeReason: dto.revokeReason ?? null,
        updatedAt: new Date(),
      },
      include: {
        template: { select: { title: true } },
        issuedBy: {
          select: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    })

    try {
      await this.db.studentTimelineEvent.create({
        data: {
          studentId,
          eventType: 'CERTIFICATE_REVOKED',
          title: 'مدرک لغو شد',
          description: `مدرک "${cert.title}" (${cert.certificateNumber}) لغو شد${dto.revokeReason ? ': ' + dto.revokeReason : ''}`,
          metadata: { certificateId: cert.id, certificateNumber: cert.certificateNumber },
        },
      })
    } catch {
      // Timeline event may fail if enum not yet in DB — non-fatal
    }

    return this.mapCertificate(updated)
  }

  async getCertificateForPortal(userId: string) {
    const student = await this.db.student.findFirst({ where: { userId } })
    if (!student) return { data: [], total: 0, page: 1, limit: 100 }
    const certs = await this.db.studentCertificate.findMany({
      where: { studentId: student.id },
      orderBy: { issuedAt: 'desc' },
      include: { template: { select: { title: true } } },
    })
    return {
      data: certs.map((c: any) => this.mapCertificateForPortal(c)),
      total: certs.length,
      page: 1,
      limit: 100,
    }
  }

  async getPortalCertificateById(userId: string, certificateId: string) {
    const student = await this.db.student.findFirst({ where: { userId } })
    if (!student) throw new ForbiddenException()
    const cert = await this.db.studentCertificate.findFirst({
      where: { id: certificateId, studentId: student.id },
      include: { template: { select: { title: true } } },
    })
    if (!cert) throw new NotFoundException('مدرک یافت نشد')
    return this.mapCertificateForPortal(cert)
  }

  async verifyPublicCertificate(verificationCode: string) {
    const cert = await this.db.studentCertificate.findFirst({
      where: { verificationCode },
      include: {
        student: { include: { user: { include: { profile: true } } } },
      },
    })
    if (!cert) {
      return {
        isValid: false,
        verifiedBy: 'ایرنو',
        message: 'این کد اعتبارسنجی معتبر نیست.',
      }
    }
    if (!cert.publicVerifyEnabled) {
      return {
        isValid: false,
        verifiedBy: 'ایرنو',
        message: 'اعتبارسنجی عمومی برای این مدرک فعال نیست.',
      }
    }
    const profile = cert.student?.user?.profile
    const studentDisplayName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : 'دانشجو'
    const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date()
    const effectiveStatus =
      cert.status === 'REVOKED' ? 'REVOKED' : isExpired ? 'EXPIRED' : cert.status

    return {
      certificateNumber: cert.certificateNumber,
      title: cert.title,
      studentDisplayName,
      type: cert.type,
      status: effectiveStatus,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt ?? null,
      sourceSummary: cert.sourceType ? `نوع: ${cert.sourceType}` : null,
      isValid: effectiveStatus === 'ACTIVE',
      verifiedBy: 'ایرنو',
    }
  }

  async generateCertificateForCourseCompletion(
    studentId: string,
    enrollmentId: string,
    issuedById: string,
  ) {
    const template = await this.db.certificateTemplate.findFirst({
      where: { type: 'COURSE_COMPLETION', isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    const duplicate = await this.db.studentCertificate.findFirst({
      where: { studentId, sourceType: 'ENROLLMENT', sourceId: enrollmentId },
    })
    if (duplicate) return duplicate

    const enrollment = await this.db.enrollment.findFirst({
      where: { id: enrollmentId },
      include: { course: { select: { title: true } } },
    })
    if (!enrollment) throw new NotFoundException('ثبت‌نام یافت نشد')

    return this.issueCertificate(
      studentId,
      {
        templateId: template?.id,
        title: `گواهی اتمام دوره ${enrollment.course?.title ?? ''}`.trim(),
        type: 'COURSE_COMPLETION' as any,
        sourceType: 'ENROLLMENT' as any,
        sourceId: enrollmentId,
        publicVerifyEnabled: true,
      },
      issuedById,
    )
  }

  async generateCertificateFromCredit(
    studentId: string,
    studentCreditId: string,
    issuedById: string,
  ) {
    const studentCredit = await this.db.studentCredit.findFirst({
      where: { id: studentCreditId, studentId },
      include: { credit: { select: { title: true } } },
    })
    if (!studentCredit) throw new NotFoundException('اعتبار دانشجو یافت نشد')

    const template = await this.db.certificateTemplate.findFirst({
      where: { type: 'SKILL_CREDIT', isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    const duplicate = await this.db.studentCertificate.findFirst({
      where: { studentId, sourceType: 'CREDIT', sourceId: studentCreditId },
    })
    if (duplicate) return duplicate

    return this.issueCertificate(
      studentId,
      {
        templateId: template?.id,
        title: `گواهی ${studentCredit.credit?.title ?? ''}`.trim(),
        type: 'SKILL_CREDIT' as any,
        sourceType: 'CREDIT' as any,
        sourceId: studentCreditId,
        publicVerifyEnabled: true,
      },
      issuedById,
    )
  }

  // ── Mappers ───────────────────────────────────────────────

  private mapTemplate(t: any) {
    return {
      id: t.id,
      title: t.title,
      slug: t.slug,
      description: t.description ?? null,
      type: t.type,
      language: t.language,
      layoutConfig: t.layoutConfig ?? null,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }
  }

  private mapCertificate(c: any) {
    return {
      id: c.id,
      studentId: c.studentId,
      templateId: c.templateId ?? null,
      templateTitle: c.template?.title ?? null,
      title: c.title,
      certificateNumber: c.certificateNumber,
      type: c.type,
      status: c.status,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt ?? null,
      sourceType: c.sourceType ?? null,
      sourceId: c.sourceId ?? null,
      issuedById: c.issuedById,
      issuedByName: c.issuedBy?.profile
        ? `${c.issuedBy.profile.firstName} ${c.issuedBy.profile.lastName}`.trim()
        : null,
      verificationCode: c.verificationCode,
      publicVerifyEnabled: c.publicVerifyEnabled,
      revokedAt: c.revokedAt ?? null,
      revokeReason: c.revokeReason ?? null,
      createdAt: c.createdAt,
    }
  }

  private mapCertificateForPortal(c: any) {
    return {
      id: c.id,
      title: c.title,
      certificateNumber: c.certificateNumber,
      type: c.type,
      status: c.status,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt ?? null,
      verificationCode: c.verificationCode,
      publicVerifyEnabled: c.publicVerifyEnabled,
    }
  }
}
