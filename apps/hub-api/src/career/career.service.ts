import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { computeKeywordMatch } from './resume-checker/keyword-match.js'
import { ResumeCheckerService } from './resume-checker.service'
import type { UpdateCareerProfileDto } from './dto/update-career-profile.dto'
import type { CreateResumeDto } from './dto/create-resume.dto'
import type { UpdateResumeDto } from './dto/update-resume.dto'
import type { CreateSectionDto } from './dto/create-section.dto'
import type { UpdateSectionDto } from './dto/update-section.dto'
import type { CreatePortfolioProjectDto } from './dto/create-portfolio-project.dto'
import type { UpdatePortfolioProjectDto } from './dto/update-portfolio-project.dto'
import type { CreateJobMatchDto } from './dto/create-job-match.dto'
import type { ImportIrnoDataDto } from './dto/import-irno-data.dto'
import type { UpdateResumeStyleDto, UpdateResumeTemplateDto, UpdateResumeWatermarkDto } from './dto/update-resume-style.dto'

/**
 * CareerService — business logic for the Career Studio module.
 *
 * All Prisma models added in Phase 14 are not yet in the generated Prisma client,
 * so they are accessed via `(this.prisma as any).modelName`.
 */
@Injectable()
export class CareerService {
  private readonly logger = new Logger(CareerService.name)

  private get db() {
    return this.prisma as any
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkerService: ResumeCheckerService,
  ) {}

  // ── Career Profile ─────────────────────────────────────────────────────────

  async getOrCreateCareerProfile(userId: string, studentId?: string, displayName?: string) {
    const existing = await this.db.careerProfile.findUnique({
      where: { userId },
      include: {
        _count: { select: { resumes: { where: { deletedAt: null } } } },
      },
    })
    if (existing) return this.mapCareerProfile(existing)

    const created = await this.db.careerProfile.create({
      data: {
        userId,
        studentId: studentId ?? null,
        displayName: displayName ?? 'کاربر ایرنو',
        visibility: 'PRIVATE',
      },
      include: {
        _count: { select: { resumes: { where: { deletedAt: null } } } },
      },
    })
    return this.mapCareerProfile(created)
  }

  async getCareerProfile(userId: string) {
    const profile = await this.db.careerProfile.findUnique({
      where: { userId },
      include: {
        _count: { select: { resumes: { where: { deletedAt: null } } } },
      },
    })
    if (!profile) throw new NotFoundException('پروفایل کاریابی یافت نشد')
    return this.mapCareerProfile(profile)
  }

  async updateCareerProfile(userId: string, dto: UpdateCareerProfileDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل کاریابی یافت نشد')

    if (dto.publicSlug && dto.publicSlug !== profile.publicSlug) {
      const slugConflict = await this.db.careerProfile.findFirst({
        where: { publicSlug: dto.publicSlug, id: { not: profile.id } },
      })
      if (slugConflict) throw new ConflictException('این آدرس عمومی قبلاً استفاده شده است')
    }

    const updated = await this.db.careerProfile.update({
      where: { id: profile.id },
      data: {
        displayName: dto.displayName,
        headline: dto.headline,
        summary: dto.summary,
        location: dto.location,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        publicSlug: dto.publicSlug,
        visibility: dto.visibility,
        avatarUrl: dto.avatarUrl,
        linkedinUrl: dto.linkedinUrl,
        githubUrl: dto.githubUrl,
        portfolioUrl: dto.portfolioUrl,
      },
      include: {
        _count: { select: { resumes: { where: { deletedAt: null } } } },
      },
    })
    return this.mapCareerProfile(updated)
  }

  async updatePublicSettings(userId: string, dto: import('./dto/update-public-settings.dto').UpdatePublicSettingsDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل کاریابی یافت نشد')

    if (dto.publicSlug && dto.publicSlug !== profile.publicSlug) {
      const slugConflict = await this.db.careerProfile.findFirst({
        where: { publicSlug: dto.publicSlug, id: { not: profile.id } },
      })
      if (slugConflict) throw new ConflictException('این آدرس عمومی قبلاً استفاده شده است')
    }

    // Phase 19 fields (contactVisibilityConfig, seoTitle, seoDescription, publicThemeConfig)
    // may not exist in the generated Prisma client if db:generate was not run after Phase 19 migration.
    // Try direct update first; fall back to settings._publicSettings JSON.
    try {
      const updated = await this.db.careerProfile.update({
        where: { id: profile.id },
        data: {
          publicSlug: dto.publicSlug !== undefined ? dto.publicSlug : undefined,
          visibility: dto.visibility,
          contactVisibilityConfig: dto.contactVisibilityConfig !== undefined ? dto.contactVisibilityConfig : undefined,
          seoTitle: dto.seoTitle !== undefined ? dto.seoTitle : undefined,
          seoDescription: dto.seoDescription !== undefined ? dto.seoDescription : undefined,
          publicThemeConfig: dto.publicThemeConfig !== undefined ? dto.publicThemeConfig : undefined,
        },
        include: {
          _count: { select: { resumes: { where: { deletedAt: null } } } },
        },
      })
      return this.mapCareerProfile(updated)
    } catch (directErr: any) {
      // Fallback: Phase 19 fields (contactVisibilityConfig, seoTitle, etc.) may not be in the
      // generated Prisma client if pnpm db:generate was not run after Phase 19 migration.
      // Save only publicSlug + visibility (which exist since Phase 14) to avoid a 500.
      // NOTE: CareerProfile has no `settings` field — do NOT try to save there.
      this.logger.warn(
        'updatePublicSettings: Phase 19 fields not in Prisma client — saving publicSlug + visibility only. Run pnpm db:generate.',
        directErr?.message,
      )
      try {
        const updated = await this.db.careerProfile.update({
          where: { id: profile.id },
          data: {
            publicSlug: dto.publicSlug !== undefined ? dto.publicSlug : undefined,
            visibility: dto.visibility,
          },
          include: {
            _count: { select: { resumes: { where: { deletedAt: null } } } },
          },
        })
        return this.mapCareerProfile(updated)
      } catch (fallbackErr: any) {
        this.logger.error('updatePublicSettings fallback also failed', fallbackErr?.message)
        throw new InternalServerErrorException('خطا در ذخیره تنظیمات پروفایل عمومی')
      }
    }
  }

  // ── Resumes ────────────────────────────────────────────────────────────────

  async listResumes(userId: string, page = 1, pageSize = 20) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) return { data: [], total: 0, page, pageSize }

    const where = { careerProfileId: profile.id, deletedAt: null }
    const [data, total] = await Promise.all([
      this.db.resumeDocument.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { sections: true } },
        },
      }),
      this.db.resumeDocument.count({ where }),
    ])
    return { data: data.map(this.mapResume), total, page, pageSize }
  }

  async getResume(id: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
      include: {
        sections: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { sections: true } },
      },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')
    return this.mapResume(resume)
  }

  async createResume(userId: string, careerProfileId: string, dto: CreateResumeDto) {
    const resume = await this.db.resumeDocument.create({
      data: {
        userId,
        careerProfileId,
        title: dto.title,
        templateId: dto.templateId ?? null,
        visibility: dto.visibility ?? 'PRIVATE',
        targetRole: dto.targetRole ?? null,
        language: dto.language ?? 'FA',
      },
      include: {
        _count: { select: { sections: true } },
      },
    })

    // If a template is specified, create default sections from it
    if (dto.templateId) {
      const template = await this.db.resumeTemplate.findFirst({
        where: { id: dto.templateId, isActive: true },
      })
      if (template?.defaultSections && Array.isArray(template.defaultSections)) {
        await Promise.all(
          (template.defaultSections as any[]).map((s: any, idx: number) =>
            this.db.resumeSection.create({
              data: {
                resumeDocumentId: resume.id,
                type: s.type ?? s.sectionType,
                title: s.title ?? null,
                content: s.content ?? {},
                sortOrder: s.sortOrder ?? idx,
                isVisible: true,
              },
            }),
          ),
        )
      }
    }

    return this.mapResume(resume)
  }

  async updateResume(id: string, userId: string, dto: UpdateResumeDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    const updated = await this.db.resumeDocument.update({
      where: { id },
      data: {
        title: dto.title,
        templateId: dto.templateId,
        visibility: dto.visibility,
        targetRole: dto.targetRole,
        language: dto.language,
      },
      include: {
        _count: { select: { sections: true } },
      },
    })
    return this.mapResume(updated)
  }

  async deleteResume(id: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    await this.db.resumeDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return { message: 'رزومه حذف شد' }
  }

  async duplicateResume(id: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const original = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!original) throw new NotFoundException('رزومه یافت نشد')

    // Create new resume — try with Phase 15 fields, fall back to settings JSON for Phase 14 compat
    let copy: any
    try {
      copy = await this.db.resumeDocument.create({
        data: {
          userId: original.userId,
          careerProfileId: original.careerProfileId,
          title: `${original.title} (کپی)`,
          targetRole: original.targetRole,
          language: original.language,
          templateId: original.templateId,
          visibility: 'PRIVATE',
          styleConfig: original.styleConfig,
          settings: original.settings,
          includeWatermark: original.includeWatermark ?? true,
          watermarkConfig: original.watermarkConfig,
        },
        include: { _count: { select: { sections: true } } },
      })
    } catch {
      // Phase 14 fallback: store watermark in settings JSON
      const settingsWm = (original as any)?._watermark
      const fallbackSettings = {
        ...((original.settings as object) ?? {}),
        _watermark: {
          includeWatermark: original.includeWatermark ?? settingsWm?.includeWatermark ?? true,
          watermarkConfig: original.watermarkConfig ?? settingsWm?.watermarkConfig ?? null,
        },
      }
      copy = await this.db.resumeDocument.create({
        data: {
          userId: original.userId,
          careerProfileId: original.careerProfileId,
          title: `${original.title} (کپی)`,
          targetRole: original.targetRole,
          language: original.language,
          templateId: original.templateId,
          visibility: 'PRIVATE',
          styleConfig: original.styleConfig,
          settings: fallbackSettings,
        },
        include: { _count: { select: { sections: true } } },
      })
    }

    // Copy sections
    if (original.sections?.length > 0) {
      await Promise.all(
        original.sections.map((s: any) =>
          this.db.resumeSection.create({
            data: {
              resumeDocumentId: copy.id,
              type: s.type,
              title: s.title,
              content: s.content,
              layoutConfig: s.layoutConfig,
              styleConfig: s.styleConfig,
              sortOrder: s.sortOrder,
              isVisible: s.isVisible,
            },
          }),
        ),
      )
    }

    return this.mapResume(copy)
  }

  async updateResumeStyle(id: string, userId: string, dto: UpdateResumeStyleDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    const currentStyle = (resume.styleConfig as Record<string, unknown>) ?? {}
    const newStyle = {
      ...currentStyle,
      ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
      ...(dto.fontSize !== undefined && { fontSize: dto.fontSize }),
      ...(dto.accentColor !== undefined && { accentColor: dto.accentColor }),
      ...(dto.spacing !== undefined && { spacing: dto.spacing }),
      ...(dto.pageSize !== undefined && { pageSize: dto.pageSize }),
      ...(dto.customConfig !== undefined && { ...dto.customConfig }),
    }

    const updated = await this.db.resumeDocument.update({
      where: { id },
      data: { styleConfig: newStyle },
      include: { _count: { select: { sections: true } } },
    })
    return this.mapResume(updated)
  }

  async updateResumeTemplate(id: string, userId: string, dto: UpdateResumeTemplateDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    // If a new templateId is set, merge in its defaultStyleConfig
    let newStyleConfig = resume.styleConfig ?? {}
    if (dto.templateId) {
      const template = await this.db.resumeTemplate.findFirst({
        where: { id: dto.templateId, isActive: true },
      })
      if (template?.defaultStyleConfig && typeof template.defaultStyleConfig === 'object') {
        newStyleConfig = { ...template.defaultStyleConfig as object, ...(resume.styleConfig as object ?? {}) }
      }
    }

    const updated = await this.db.resumeDocument.update({
      where: { id },
      data: { templateId: dto.templateId ?? null, styleConfig: newStyleConfig },
      include: { _count: { select: { sections: true } } },
    })
    return this.mapResume(updated)
  }

  async updateResumeWatermark(id: string, userId: string, dto: UpdateResumeWatermarkDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    // Try to update Phase 15 direct fields; fall back to settings._watermark for Phase 14 compat
    let updated: any
    try {
      updated = await this.db.resumeDocument.update({
        where: { id },
        data: {
          ...(dto.includeWatermark !== undefined && { includeWatermark: dto.includeWatermark }),
          ...(dto.watermarkConfig !== undefined && { watermarkConfig: dto.watermarkConfig }),
        },
        include: { _count: { select: { sections: true } } },
      })
    } catch {
      // Phase 14 fallback: store watermark in settings JSON
      const existingSettings = (resume.settings as object) ?? {}
      const existingWatermark = (existingSettings as any)?._watermark ?? {}
      const newSettings = {
        ...existingSettings,
        _watermark: {
          ...existingWatermark,
          ...(dto.includeWatermark !== undefined && { includeWatermark: dto.includeWatermark }),
          ...(dto.watermarkConfig !== undefined && { watermarkConfig: dto.watermarkConfig }),
        },
      }
      updated = await this.db.resumeDocument.update({
        where: { id },
        data: { settings: newSettings },
        include: { _count: { select: { sections: true } } },
      })
    }
    return this.mapResume(updated)
  }

  // ── Sections ───────────────────────────────────────────────────────────────

  async listSections(resumeId: string, userId: string) {
    await this.assertResumeOwner(resumeId, userId)
    const sections = await this.db.resumeSection.findMany({
      where: { resumeDocumentId: resumeId },
      orderBy: { sortOrder: 'asc' },
    })
    return sections.map(this.mapSection)
  }

  async createSection(resumeId: string, userId: string, dto: CreateSectionDto) {
    await this.assertResumeOwner(resumeId, userId)

    const maxOrder = await this.db.resumeSection.aggregate({
      where: { resumeDocumentId: resumeId },
      _max: { sortOrder: true },
    })
    const nextOrder = dto.sortOrder ?? ((maxOrder._max.sortOrder ?? -1) + 1)

    const section = await this.db.resumeSection.create({
      data: {
        resumeDocumentId: resumeId,
        type: dto.type,
        title: dto.title ?? null,
        content: dto.content ?? {},
        sortOrder: nextOrder,
        isVisible: dto.isVisible ?? true,
      },
    })
    return this.mapSection(section)
  }

  async updateSection(resumeId: string, sectionId: string, userId: string, dto: UpdateSectionDto) {
    await this.assertResumeOwner(resumeId, userId)

    const section = await this.db.resumeSection.findFirst({
      where: { id: sectionId, resumeDocumentId: resumeId },
    })
    if (!section) throw new NotFoundException('بخش رزومه یافت نشد')

    const updated = await this.db.resumeSection.update({
      where: { id: sectionId },
      data: {
        type: dto.type,
        title: dto.title,
        content: dto.content,
        sortOrder: dto.sortOrder,
        isVisible: dto.isVisible,
      },
    })
    return this.mapSection(updated)
  }

  async deleteSection(resumeId: string, sectionId: string, userId: string) {
    await this.assertResumeOwner(resumeId, userId)

    const section = await this.db.resumeSection.findFirst({
      where: { id: sectionId, resumeDocumentId: resumeId },
    })
    if (!section) throw new NotFoundException('بخش رزومه یافت نشد')

    await this.db.resumeSection.delete({ where: { id: sectionId } })
    return { message: 'بخش حذف شد' }
  }

  async reorderSections(resumeId: string, userId: string, sectionIds: string[]) {
    await this.assertResumeOwner(resumeId, userId)

    await Promise.all(
      sectionIds.map((id, idx) =>
        this.db.resumeSection.updateMany({
          where: { id, resumeDocumentId: resumeId },
          data: { sortOrder: idx },
        }),
      ),
    )
    return this.listSections(resumeId, userId)
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async listTemplates() {
    const templates = await this.db.resumeTemplate.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    })
    return templates.map(this.mapTemplate)
  }

  // ── Public Resume ──────────────────────────────────────────────────────────

  async getPublicResume(slug: string) {
    const profile = await this.db.careerProfile.findFirst({
      where: { publicSlug: slug },
    })
    if (!profile) throw new NotFoundException('پروفایل یافت نشد')
    if (profile.visibility === 'PRIVATE' || profile.visibility === 'DISABLED') {
      throw new NotFoundException('این پروفایل عمومی نیست')
    }

    // Default contact visibility
    const defaultContactVisibility = {
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showWebsite: true,
      showLinkedin: true,
      showGithub: true,
      showPortfolio: true,
    }
    // Phase 19 field — fall back to settings._publicSettings if db:generate not run
    const rawContactVis =
      profile.contactVisibilityConfig ??
      (profile.settings as any)?._publicSettings?.contactVisibilityConfig ??
      {}
    const contactVis: Record<string, boolean> = {
      ...defaultContactVisibility,
      ...(rawContactVis as Record<string, boolean>),
    }

    // Build contact object based on visibility settings
    const contact = {
      email: contactVis['showEmail'] ? (profile.email ?? null) : null,
      phone: contactVis['showPhone'] ? (profile.phone ?? null) : null,
      location: contactVis['showLocation'] ? (profile.location ?? null) : null,
      website: contactVis['showWebsite'] ? (profile.website ?? null) : null,
      linkedinUrl: contactVis['showLinkedin'] ? (profile.linkedinUrl ?? null) : null,
      githubUrl: contactVis['showGithub'] ? (profile.githubUrl ?? null) : null,
      portfolioUrl: contactVis['showPortfolio'] ? (profile.portfolioUrl ?? null) : null,
    }

    // Get public resume
    const resume = await this.db.resumeDocument.findFirst({
      where: {
        careerProfileId: profile.id,
        visibility: 'PUBLIC_LINK',
        deletedAt: null,
      },
      include: {
        sections: { where: { isVisible: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Check if a generated PDF export exists for this resume
    let hasPdfExport = false
    if (resume) {
      try {
        const pdfExport = await this.db.resumeExport.findFirst({
          where: { resumeDocumentId: resume.id, format: 'PDF', status: 'GENERATED' },
          select: { id: true },
        })
        hasPdfExport = !!pdfExport
      } catch {
        // resumeExport table may not exist yet before migration — ignore
      }
    }

    // Get public portfolio projects
    const portfolioProjects = await this.db.portfolioProject.findMany({
      where: {
        careerProfileId: profile.id,
        visibility: { in: ['PUBLIC_LINK', 'PUBLIC'] },
        deletedAt: null,
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    // Get public certificates (if user has student profile linked)
    let certificates: any[] = []
    if (profile.studentId) {
      try {
        certificates = await (this.prisma as any).studentCertificate.findMany({
          where: {
            studentId: profile.studentId,
            status: 'ACTIVE',
            deletedAt: null,
          },
          include: {
            template: { select: { title: true, type: true } },
          },
          orderBy: { issuedAt: 'desc' },
          take: 10,
        })
      } catch {
        // Certificates module may not be available
      }
    }

    return {
      slug: profile.publicSlug,
      displayName: profile.displayName,
      headline: profile.headline,
      summary: profile.summary,
      avatarUrl: profile.avatarUrl,
      seoTitle: profile.seoTitle ?? (profile.settings as any)?._publicSettings?.seoTitle ?? null,
      seoDescription: profile.seoDescription ?? (profile.settings as any)?._publicSettings?.seoDescription ?? null,
      contact,
      contactVisibility: contactVis,
      resume: resume
        ? {
            id: resume.id,
            title: resume.title,
            targetRole: resume.targetRole,
            language: resume.language,
            templateId: resume.templateId,
            styleConfig: resume.styleConfig ?? null,
            allowPdfDownload: resume.allowPdfDownload ?? true,
            hasPdfExport,
            sections: resume.sections?.map(this.mapSection) ?? [],
          }
        : null,
      portfolioProjects: portfolioProjects.map((p: any) => this.mapPublicPortfolioProject(p)),
      certificates: certificates.map((c: any) => ({
        id: c.id,
        title: c.template?.title ?? c.customTitle ?? 'مدرک',
        issuedAt: c.issuedAt,
        verificationCode: c.verificationCode,
        templateType: c.template?.type ?? 'COMPLETION',
      })),
    }
  }

  // ── Portfolio ──────────────────────────────────────────────────────────────

  /**
   * Generate a URL-friendly slug from a title.
   * Appends -2, -3, etc. if the slug already exists for this profile.
   */
  private async generatePortfolioSlug(title: string, careerProfileId: string, excludeId?: string): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^؀-ۿa-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) || 'project'

    // Try base first, then base-2, base-3, ...
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`
      const existing = await this.db.portfolioProject.findFirst({
        where: {
          careerProfileId,
          slug: candidate,
          deletedAt: null,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      })
      if (!existing) return candidate
    }
    // fallback: base + timestamp suffix
    return `${base}-${Date.now()}`
  }

  async listPortfolioProjects(userId: string, page = 1, pageSize = 20) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) return { data: [], total: 0, page, pageSize }

    const where = { careerProfileId: profile.id, deletedAt: null }
    const [data, total] = await Promise.all([
      this.db.portfolioProject.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.db.portfolioProject.count({ where }),
    ])
    return { data: data.map((p: any) => this.mapPortfolioProject(p)), total, page, pageSize }
  }

  async getPortfolioProject(userId: string, projectId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروژه یافت نشد')
    const project = await this.db.portfolioProject.findFirst({
      where: { id: projectId, careerProfileId: profile.id, deletedAt: null },
    })
    if (!project) throw new NotFoundException('پروژه یافت نشد')
    return this.mapPortfolioProject(project)
  }

  async createPortfolioProject(userId: string, careerProfileId: string, dto: CreatePortfolioProjectDto) {
    // Auto-generate slug from title if not provided
    const slug = dto.slug
      ? dto.slug
      : await this.generatePortfolioSlug(dto.title, careerProfileId)

    const project = await this.db.portfolioProject.create({
      data: {
        userId,
        careerProfileId,
        title: dto.title,
        slug,
        role: dto.role ?? null,
        clientName: (dto as any).clientName ?? null,
        description: dto.description ?? null,
        summary: (dto as any).summary ?? null,
        problem: (dto as any).problem ?? null,
        solution: (dto as any).solution ?? null,
        impact: (dto as any).impact ?? null,
        responsibilities: (dto as any).responsibilities ?? [],
        technologies: dto.technologies ?? [],
        links: dto.links ?? null,
        images: dto.images ?? null,
        mediaUrls: (dto as any).mediaUrls ?? [],
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        projectType: (dto as any).projectType ?? null,
        visibility: dto.visibility ?? 'PRIVATE',
        sortOrder: dto.sortOrder ?? 0,
        isFeatured: dto.isFeatured ?? false,
        coverImageUrl: dto.coverImageUrl ?? null,
        demoUrl: dto.demoUrl ?? null,
        repoUrl: dto.repoUrl ?? null,
        caseStudy: dto.caseStudy ?? null,
        seoTitle: (dto as any).seoTitle ?? null,
        seoDescription: (dto as any).seoDescription ?? null,
      },
    })
    return this.mapPortfolioProject(project)
  }

  async updatePortfolioProject(id: string, userId: string, dto: UpdatePortfolioProjectDto) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروژه یافت نشد')

    const project = await this.db.portfolioProject.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!project) throw new NotFoundException('پروژه یافت نشد')

    // Resolve slug: if dto provides one, use it; otherwise keep existing
    let slug: string | undefined = undefined
    if ((dto as any).slug !== undefined) {
      slug = (dto as any).slug || await this.generatePortfolioSlug(dto.title ?? project.title, profile.id, id)
    }

    const updated = await this.db.portfolioProject.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(slug !== undefined && { slug }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...((dto as any).clientName !== undefined && { clientName: (dto as any).clientName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...((dto as any).summary !== undefined && { summary: (dto as any).summary }),
        ...((dto as any).problem !== undefined && { problem: (dto as any).problem }),
        ...((dto as any).solution !== undefined && { solution: (dto as any).solution }),
        ...((dto as any).impact !== undefined && { impact: (dto as any).impact }),
        ...((dto as any).responsibilities !== undefined && { responsibilities: (dto as any).responsibilities }),
        ...(dto.technologies !== undefined && { technologies: dto.technologies }),
        ...(dto.links !== undefined && { links: dto.links }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...((dto as any).mediaUrls !== undefined && { mediaUrls: (dto as any).mediaUrls }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...((dto as any).projectType !== undefined && { projectType: (dto as any).projectType }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.demoUrl !== undefined && { demoUrl: dto.demoUrl }),
        ...(dto.repoUrl !== undefined && { repoUrl: dto.repoUrl }),
        ...(dto.caseStudy !== undefined && { caseStudy: dto.caseStudy }),
        ...((dto as any).seoTitle !== undefined && { seoTitle: (dto as any).seoTitle }),
        ...((dto as any).seoDescription !== undefined && { seoDescription: (dto as any).seoDescription }),
      },
    })
    return this.mapPortfolioProject(updated)
  }

  async deletePortfolioProject(id: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروژه یافت نشد')

    const project = await this.db.portfolioProject.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!project) throw new NotFoundException('پروژه یافت نشد')

    await this.db.portfolioProject.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return { message: 'پروژه حذف شد' }
  }

  async reorderPortfolioProjects(userId: string, items: { id: string; sortOrder: number }[]) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل کاریابی یافت نشد')

    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.db.portfolioProject.updateMany({
          where: { id, careerProfileId: profile.id, deletedAt: null },
          data: { sortOrder },
        }),
      ),
    )
    return { message: 'ترتیب پروژه‌ها به‌روزرسانی شد' }
  }

  async togglePortfolioProjectFeatured(id: string, userId: string, isFeatured: boolean) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروژه یافت نشد')

    const project = await this.db.portfolioProject.findFirst({
      where: { id, careerProfileId: profile.id, deletedAt: null },
    })
    if (!project) throw new NotFoundException('پروژه یافت نشد')

    const updated = await this.db.portfolioProject.update({
      where: { id },
      data: { isFeatured },
    })
    return this.mapPortfolioProject(updated)
  }

  /**
   * Get a single public portfolio project by profile slug + project slug.
   * Visibility must be PUBLIC_LINK or PUBLIC.
   */
  async getPublicPortfolioProject(profileSlug: string, projectSlug: string) {
    const profile = await this.db.careerProfile.findFirst({
      where: { publicSlug: profileSlug },
    })
    if (!profile) throw new NotFoundException('پروفایل یافت نشد')
    if (profile.visibility === 'PRIVATE' || profile.visibility === 'DISABLED') {
      throw new NotFoundException('پروفایل یافت نشد')
    }

    const project = await this.db.portfolioProject.findFirst({
      where: {
        careerProfileId: profile.id,
        slug: projectSlug,
        deletedAt: null,
        visibility: { in: ['PUBLIC_LINK', 'PUBLIC'] },
      },
    })
    if (!project) throw new NotFoundException('پروژه یافت نشد')
    return this.mapPublicPortfolioProject(project)
  }

  // ── Roadmaps ───────────────────────────────────────────────────────────────

  async listRoadmaps(page = 1, pageSize = 20) {
    const where = { status: 'PUBLISHED', deletedAt: null }
    const [data, total] = await Promise.all([
      this.db.roadmap.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { nodes: true } } },
      }),
      this.db.roadmap.count({ where }),
    ])
    return { data: data.map(this.mapRoadmap), total, page, pageSize }
  }

  async getRoadmap(slug: string) {
    const roadmap = await this.db.roadmap.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: {
        nodes: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { nodes: true } },
      },
    })
    if (!roadmap) throw new NotFoundException('نقشه راه یافت نشد')
    return this.mapRoadmap(roadmap)
  }

  // ── Job Match ──────────────────────────────────────────────────────────────

  async createJobMatch(userId: string, careerProfileId: string, dto: CreateJobMatchDto) {
    const jobDescription = (dto.jobDescription ?? '').trim()
    const resumeDocId = dto.resumeDocumentId ?? dto.resumeId ?? null

    // ── Validate jobDescription ───────────────────────────────────────────────
    if (jobDescription.length < 30) {
      throw new BadRequestException('شرح موقعیت شغلی باید حداقل ۳۰ کاراکتر داشته باشد.')
    }

    // ── Validate resume source — at most one may be provided ─────────────────
    const hasIrnoResume = !!resumeDocId
    const hasPastedText = !!(dto.resumeText && dto.resumeText.trim().length > 0)
    if (hasIrnoResume && hasPastedText) {
      throw new BadRequestException(
        'فقط یک منبع رزومه مجاز است: یا رزومه ایرنو یا متن چسبانده‌شده را ارسال کنید.',
      )
    }

    // ── Determine sourceType ──────────────────────────────────────────────────
    let sourceType: 'IRNO_RESUME' | 'PASTED_TEXT' | 'UPLOADED_FILE'
    if (dto.sourceType) {
      sourceType = dto.sourceType
    } else if (hasIrnoResume) {
      sourceType = 'IRNO_RESUME'
    } else if (hasPastedText) {
      sourceType = 'PASTED_TEXT'
    } else {
      // JD-only mode — valid, produces keyword analysis without resume text
      sourceType = 'IRNO_RESUME'
    }

    // ── Extract resume text for keyword matching ──────────────────────────────
    let resumeText = ''
    let sourceTextSnapshot: string | null = null

    if (sourceType === 'IRNO_RESUME' && resumeDocId) {
      // Extract text from structured Irno resume sections
      try {
        const resumeDoc = await this.db.resumeDocument.findFirst({
          where: { id: resumeDocId, careerProfileId, deletedAt: null },
          include: { sections: { orderBy: { sortOrder: 'asc' } } },
        })
        if (resumeDoc?.sections) {
          const parts: string[] = []
          for (const sec of resumeDoc.sections ?? []) {
            const c = sec.content as Record<string, unknown> | null
            if (!c) continue
            if (c['text']) parts.push(String(c['text']))
            const items = (c['items'] ?? c['entries'] ?? []) as Record<string, unknown>[]
            for (const item of items) {
              if (item['role']) parts.push(String(item['role']))
              if (item['description']) parts.push(String(item['description']))
              const achievements: string[] = (item['achievements'] ?? []) as string[]
              parts.push(...achievements)
              const techs: string[] = (item['technologies'] ?? []) as string[]
              parts.push(...techs)
              const skills: string[] = (item['skills'] ?? []) as string[]
              parts.push(...skills)
            }
            const groups = (c['groups'] ?? []) as Record<string, unknown>[]
            for (const g of groups) {
              const skills: string[] = (g['skills'] ?? []) as string[]
              parts.push(...skills)
            }
          }
          resumeText = parts.filter(Boolean).join(' ')
        }
      } catch {
        // Non-fatal — proceed without resume text
      }
    } else if (sourceType === 'PASTED_TEXT' || sourceType === 'UPLOADED_FILE') {
      // Text already extracted (pasted by user or extracted from file by controller)
      const raw = dto.resumeText ?? ''
      if (!raw || raw.trim().length < 30) {
        throw new BadRequestException('متن رزومه باید حداقل ۳۰ کاراکتر داشته باشد.')
      }
      resumeText = raw.trim()
      sourceTextSnapshot = resumeText.slice(0, 5000)
    }

    // ── Rule-based keyword match ──────────────────────────────────────────────
    // Uses the same keyword engine as the Resume Checker for consistency.
    // AI-powered semantic matching is future work.
    let overallScore: number | null = null
    let keywordScore: number | null = null
    let matched: string[] = []
    let missing: string[] = []
    let skillGap: Array<{ skill: string; found: boolean }> | null = null
    const recommendations: string[] = []

    const effectiveResumeText = resumeText.trim() || ''

    const { matched: kMatched, missing: kMissing, matchRate } = computeKeywordMatch(
      effectiveResumeText || 'no resume text provided',
      jobDescription,
    )

    matched = kMatched
    missing = kMissing
    keywordScore = matchRate
    overallScore = matchRate

    skillGap = [
      ...matched.slice(0, 20).map((s) => ({ skill: s, found: true })),
      ...missing.slice(0, 15).map((s) => ({ skill: s, found: false })),
    ]

    if (matchRate < 40) {
      recommendations.push(
        `تطابق کلیدواژه‌ها ضعیف است (${matchRate}٪). رزومه را برای این موقعیت بهینه‌سازی کنید.`,
      )
    } else if (matchRate < 60) {
      recommendations.push(
        `تطابق متوسط (${matchRate}٪). با افزودن کلیدواژه‌های جاافتاده می‌توانید امتیاز بهتری کسب کنید.`,
      )
    }
    if (missing.length > 0) {
      recommendations.push(
        `این کلیدواژه‌ها در آگهی هستند اما در رزومه یافت نشدند: ${missing.slice(0, 8).join('، ')}`,
      )
    }
    if (matched.length > 0 && matchRate >= 60) {
      recommendations.push(
        `رزومه شما با این موقعیت تطابق خوبی دارد. کلیدواژه‌های کلیدی موجود: ${matched.slice(0, 6).join('، ')}`,
      )
    }
    if (!effectiveResumeText) {
      recommendations.push(
        'برای تحلیل دقیق‌تر، رزومه خود را انتخاب کنید یا متن آن را وارد کنید.',
      )
    }

    // ── Persist and return ────────────────────────────────────────────────────
    try {
      const report = await this.db.jobMatchReport.create({
        data: {
          userId,
          careerProfileId,
          resumeDocumentId: resumeDocId,
          sourceType,
          sourceFileName: dto.sourceFileName ?? null,
          sourceTextSnapshot,
          targetRole: dto.targetRole ?? null,
          jobTitle: dto.jobTitle ?? null,
          jobDescription,
          overallScore,
          keywordScore,
          skillGap,
          recommendations,
        },
      })
      return this.mapJobMatchReport(report, matched, missing)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`createJobMatch DB error: ${msg}`)
      // Fallback: return computed result without persisting
      return {
        id: `temp-${Date.now()}`,
        userId,
        careerProfileId,
        resumeDocumentId: resumeDocId,
        sourceType,
        sourceFileName: dto.sourceFileName ?? null,
        targetRole: dto.targetRole ?? null,
        jobTitle: dto.jobTitle ?? null,
        jobDescription,
        overallScore,
        keywordScore,
        matchedKeywords: matched,
        missingKeywords: missing,
        skillGap,
        recommendations,
        createdAt: new Date(),
      }
    }
  }

  async listJobMatchReports(userId: string, page = 1, pageSize = 20) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) return { data: [], total: 0, page, pageSize }

    try {
      const where = { careerProfileId: profile.id }
      const [data, total] = await Promise.all([
        this.db.jobMatchReport.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        this.db.jobMatchReport.count({ where }),
      ])
      return { data: data.map((r: any) => this.mapJobMatchReport(r)), total, page, pageSize }
    } catch {
      // JobMatchReport model not yet in Prisma client — return empty
      return { data: [], total: 0, page, pageSize }
    }
  }

  // ── Import from Irno ───────────────────────────────────────────────────────

  async importFromIrno(
    userId: string,
    studentId: string | null,
    resumeId: string,
    dto: ImportIrnoDataDto,
  ) {
    // Verify resume ownership
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('پروفایل کاریابی یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id: resumeId, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')

    const sectionsCreated: string[] = []

    // Fetch student's skills, credits, and certificates directly from the Hub DB
    if (studentId) {
      // Get next sortOrder base
      const maxOrder = await this.db.resumeSection.aggregate({
        where: { resumeDocumentId: resumeId },
        _max: { sortOrder: true },
      })
      let nextOrder: number = (maxOrder._max?.sortOrder ?? -1) + 1

      if (dto.importSkills !== false) {
        const studentSkills = await this.prisma.studentSkill.findMany({
          where: { studentId, status: 'ACTIVE' },
          include: { skill: true },
        })
        if (studentSkills.length > 0) {
          const existing = await this.db.resumeSection.findFirst({
            where: { resumeDocumentId: resumeId, type: 'SKILL' },
          })
          const skillContent = {
            groups: [
              {
                name: 'مهارت‌ها',
                skills: studentSkills.map((ss: any) => ss.skill?.title ?? '').filter(Boolean),
              },
            ],
          }
          if (!existing || dto.overwriteExisting) {
            if (existing && dto.overwriteExisting) {
              await this.db.resumeSection.update({
                where: { id: existing.id },
                data: { content: skillContent },
              })
            } else {
              await this.db.resumeSection.create({
                data: {
                  resumeDocumentId: resumeId,
                  type: 'SKILL',
                  title: 'مهارت‌ها',
                  content: skillContent,
                  sortOrder: nextOrder++,
                  isVisible: true,
                },
              })
            }
            sectionsCreated.push('SKILL')
          }
        }
      }

      if (dto.importCredits !== false) {
        const studentCredits = await this.prisma.studentCredit.findMany({
          where: { studentId, status: 'ACTIVE' },
          include: { credit: true },
        })
        if (studentCredits.length > 0) {
          const existing = await this.db.resumeSection.findFirst({
            where: { resumeDocumentId: resumeId, type: 'AWARD' },
          })
          if (!existing || dto.overwriteExisting) {
            const awardContent = {
              awards: studentCredits.map((sc: any) => ({
                title: sc.credit?.title ?? '',
                type: sc.credit?.type ?? '',
                awardedAt: sc.awardedAt,
                source: 'irno',
              })),
            }
            if (existing && dto.overwriteExisting) {
              await this.db.resumeSection.update({
                where: { id: existing.id },
                data: { content: awardContent },
              })
            } else {
              await this.db.resumeSection.create({
                data: {
                  resumeDocumentId: resumeId,
                  type: 'AWARD',
                  title: 'دستاوردها',
                  content: awardContent,
                  sortOrder: nextOrder++,
                  isVisible: true,
                },
              })
            }
            sectionsCreated.push('AWARD')
          }
        }
      }

      if (dto.importCertificates !== false) {
        const certs = await (this.prisma as any).studentCertificate.findMany({
          where: { studentId, status: { in: ['ISSUED', 'ACTIVE'] } },
          include: { template: true },
        })
        if (certs.length > 0) {
          const existing = await this.db.resumeSection.findFirst({
            where: { resumeDocumentId: resumeId, type: 'CERTIFICATE' },
          })
          if (!existing || dto.overwriteExisting) {
            const certData = {
              certificates: certs.map((c: any) => ({
                title: c.title ?? c.template?.title ?? '',
                number: c.certificateNumber,
                issuedAt: c.issuedAt,
                verificationUrl: c.verificationCode
                  ? `/verify/certificate/${c.verificationCode}`
                  : null,
                source: 'irno',
              })),
            }
            if (existing && dto.overwriteExisting) {
              await this.db.resumeSection.update({
                where: { id: existing.id },
                data: { content: certData },
              })
            } else {
              await this.db.resumeSection.create({
                data: {
                  resumeDocumentId: resumeId,
                  type: 'CERTIFICATE',
                  title: 'مدارک و گواهی‌نامه‌ها',
                  content: certData,
                  sortOrder: nextOrder++,
                  isVisible: true,
                },
              })
            }
            sectionsCreated.push('CERTIFICATE')
          }
        }
      }

      if (dto.importCourses !== false) {
        const enrollments = await this.prisma.enrollment.findMany({
          where: { studentId, status: 'ACTIVE' },
          include: { course: true, courseGroup: true },
        })
        if (enrollments.length > 0) {
          const existing = await this.db.resumeSection.findFirst({
            where: { resumeDocumentId: resumeId, type: 'EDUCATION' },
          })
          if (!existing || dto.overwriteExisting) {
            const eduData = {
              entries: enrollments.map((e: any) => ({
                institution: 'آکادمی ایرنو',
                degree: e.course?.title ?? '',
                field: e.courseGroup?.title ?? '',
                startedAt: e.courseGroup?.startDate ?? null,
                finishedAt: e.courseGroup?.endDate ?? null,
                source: 'irno',
              })),
            }
            if (existing && dto.overwriteExisting) {
              await this.db.resumeSection.update({
                where: { id: existing.id },
                data: { content: eduData },
              })
            } else {
              await this.db.resumeSection.create({
                data: {
                  resumeDocumentId: resumeId,
                  type: 'EDUCATION',
                  title: 'تحصیلات و دوره‌ها',
                  content: eduData,
                  sortOrder: nextOrder++,
                  isVisible: true,
                },
              })
            }
            sectionsCreated.push('EDUCATION')
          }
        }
      }
    }

    return {
      message: sectionsCreated.length > 0
        ? `${sectionsCreated.length} بخش از پروفایل ایرنو وارد شد`
        : 'داده‌ای برای وارد کردن یافت نشد',
      sectionsCreated,
      resumeId,
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertResumeOwner(resumeId: string, userId: string) {
    const profile = await this.db.careerProfile.findUnique({ where: { userId } })
    if (!profile) throw new NotFoundException('رزومه یافت نشد')

    const resume = await this.db.resumeDocument.findFirst({
      where: { id: resumeId, careerProfileId: profile.id, deletedAt: null },
    })
    if (!resume) throw new NotFoundException('رزومه یافت نشد')
    return resume
  }

  private mapCareerProfile(p: any) {
    // Phase 19 fields may fall back to settings._publicSettings if db:generate was not run
    const ps = (p.settings as any)?._publicSettings
    return {
      id: p.id,
      userId: p.userId,
      studentId: p.studentId,
      displayName: p.displayName,
      headline: p.headline,
      summary: p.summary,
      location: p.location,
      phone: p.phone,
      email: p.email,
      website: p.website,
      portfolioUrl: p.portfolioUrl,
      publicSlug: p.publicSlug,
      visibility: p.visibility,
      avatarUrl: p.avatarUrl,
      linkedinUrl: p.linkedinUrl,
      githubUrl: p.githubUrl,
      contactVisibilityConfig: p.contactVisibilityConfig ?? ps?.contactVisibilityConfig ?? null,
      publicThemeConfig: p.publicThemeConfig ?? ps?.publicThemeConfig ?? null,
      seoTitle: p.seoTitle ?? ps?.seoTitle ?? null,
      seoDescription: p.seoDescription ?? ps?.seoDescription ?? null,
      resumeCount: p._count?.resumes ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  }

  private mapResume(r: any) {
    // Phase 15 fields (includeWatermark, watermarkConfig) may not exist in the
    // generated Prisma client if db:generate was not run after Phase 15 migration.
    // Fall back to settings._watermark JSON for backward compat.
    const settingsWatermark = (r.settings as any)?._watermark
    return {
      id: r.id,
      careerProfileId: r.careerProfileId,
      title: r.title,
      templateId: r.templateId,
      visibility: r.visibility,
      targetRole: r.targetRole,
      language: r.language,
      styleConfig: r.styleConfig ?? null,
      settings: r.settings ?? null,
      includeWatermark: r.includeWatermark ?? settingsWatermark?.includeWatermark ?? true,
      watermarkConfig: r.watermarkConfig ?? settingsWatermark?.watermarkConfig ?? null,
      lastExportedAt: r.lastExportedAt ?? null,
      sectionCount: r._count?.sections ?? (r.sections?.length ?? 0),
      sections: r.sections?.map(this.mapSection) ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }

  private mapSection(s: any) {
    return {
      id: s.id,
      resumeDocumentId: s.resumeDocumentId,
      type: s.type,
      title: s.title,
      content: s.content,
      layoutConfig: s.layoutConfig ?? null,
      styleConfig: s.styleConfig ?? null,
      sortOrder: s.sortOrder,
      isVisible: s.isVisible,
      isImported: s.isImported ?? false,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }
  }

  private mapTemplate(t: any) {
    return {
      id: t.id,
      title: t.title,
      slug: t.slug,
      type: t.type,
      description: t.description,
      previewUrl: t.previewUrl ?? null,
      layoutConfig: t.layoutConfig ?? null,
      defaultStyleConfig: t.defaultStyleConfig ?? null,
      defaultSections: t.defaultSections ?? null,
      isPremium: t.isPremium,
      isActive: t.isActive,
      supportsAts: t.supportsAts,
      supportsRtl: t.supportsRtl,
      supportsLtr: t.supportsLtr,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt,
    }
  }

  private mapPortfolioProject(p: any) {
    return {
      id: p.id,
      userId: p.userId,
      careerProfileId: p.careerProfileId,
      studentId: p.studentId ?? null,
      title: p.title,
      slug: p.slug ?? null,
      role: p.role ?? null,
      clientName: p.clientName ?? null,
      description: p.description ?? null,
      summary: p.summary ?? null,
      problem: p.problem ?? null,
      solution: p.solution ?? null,
      impact: p.impact ?? null,
      responsibilities: p.responsibilities ?? [],
      technologies: p.technologies ?? [],
      links: p.links ?? null,
      images: p.images ?? null,
      mediaUrls: p.mediaUrls ?? [],
      caseStudy: p.caseStudy ?? null,
      startDate: p.startDate,
      endDate: p.endDate,
      projectType: p.projectType ?? null,
      visibility: p.visibility,
      sortOrder: p.sortOrder,
      isFeatured: p.isFeatured ?? false,
      coverImageUrl: p.coverImageUrl ?? null,
      demoUrl: p.demoUrl ?? null,
      repoUrl: p.repoUrl ?? null,
      seoTitle: p.seoTitle ?? null,
      seoDescription: p.seoDescription ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  }

  private mapPublicPortfolioProject(p: any) {
    return {
      id: p.id,
      title: p.title,
      slug: p.slug ?? null,
      role: p.role ?? null,
      clientName: p.clientName ?? null,
      description: p.description ?? null,
      summary: p.summary ?? null,
      problem: p.problem ?? null,
      solution: p.solution ?? null,
      impact: p.impact ?? null,
      responsibilities: p.responsibilities ?? [],
      technologies: p.technologies ?? [],
      demoUrl: p.demoUrl ?? null,
      repoUrl: p.repoUrl ?? null,
      coverImageUrl: p.coverImageUrl ?? null,
      mediaUrls: p.mediaUrls ?? [],
      caseStudy: p.caseStudy ?? null,
      startDate: p.startDate,
      endDate: p.endDate,
      projectType: p.projectType ?? null,
      isFeatured: p.isFeatured ?? false,
      sortOrder: p.sortOrder,
    }
  }

  private mapRoadmap(r: any) {
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      category: r.category,
      status: r.status,
      sortOrder: r.sortOrder,
      nodeCount: r._count?.nodes ?? r.nodes?.length ?? 0,
      nodes: r.nodes?.map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        nodeType: n.nodeType,
        status: n.status,
        sortOrder: n.sortOrder,
        parentId: n.parentId,
        resourceUrl: n.resourceUrl,
        estimatedHours: n.estimatedHours,
      })) ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }

  private mapJobMatchReport(r: any, matched?: string[], missing?: string[]) {
    // Derive matchedKeywords / missingKeywords from skillGap when not provided directly
    const skillGap: Array<{ skill: string; found: boolean }> | null = r.skillGap ?? null
    const matchedKeywords = matched ?? (skillGap ? skillGap.filter((s) => s.found).map((s) => s.skill) : [])
    const missingKeywords = missing ?? (skillGap ? skillGap.filter((s) => !s.found).map((s) => s.skill) : [])

    return {
      id: r.id,
      userId: r.userId,
      careerProfileId: r.careerProfileId,
      resumeDocumentId: r.resumeDocumentId ?? null,
      sourceType: r.sourceType ?? 'IRNO_RESUME',
      sourceFileName: r.sourceFileName ?? null,
      targetRole: r.targetRole ?? null,
      jobTitle: r.jobTitle ?? null,
      jobDescription: r.jobDescription ?? null,
      overallScore: r.overallScore ?? null,
      keywordScore: r.keywordScore ?? null,
      matchedKeywords,
      missingKeywords,
      skillGap,
      recommendations: Array.isArray(r.recommendations) ? r.recommendations : [],
      createdAt: r.createdAt,
    }
  }
}
