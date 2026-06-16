import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SkillsService } from '../skills/skills.service'
import { CreditsService } from '../credits/credits.service'
import {
  TimelineEventType,
  SkillStatus,
  CreditStatus,
  StudentSkillLevel,
  StudentCreditStatus,
} from '@irno/types'
import type { StudentSkillDto, StudentCreditDto } from '@irno/types'
import type { AwardSkillDto } from './dto/award-skill.dto'
import type { AwardCreditDto } from './dto/award-credit.dto'
import type { RevokeCreditDto } from './dto/revoke-credit.dto'

@Injectable()
export class StudentSkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skillsService: SkillsService,
    private readonly creditsService: CreditsService,
  ) {}

  private get db() {
    return this.prisma as any
  }

  // ─── Student Skills ────────────────────────────────────────────────────────

  async getStudentSkills(studentId: string): Promise<StudentSkillDto[]> {
    await this.assertStudentExists(studentId)

    const rows = await this.db.studentSkill.findMany({
      where: { studentId },
      orderBy: { awardedAt: 'desc' },
      include: {
        skill: { select: { title: true, category: true, level: true } },
        awardedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    return rows.map((r: any) => this.toStudentSkillDto(r))
  }

  async awardSkill(
    studentId: string,
    dto: AwardSkillDto,
    actorId: string,
  ): Promise<StudentSkillDto> {
    await this.assertStudentExists(studentId)

    // Validate skill exists and is active
    const skill = await this.db.skill.findFirst({
      where: { id: dto.skillId, deletedAt: null },
    })
    if (!skill) throw new NotFoundException('مهارت یافت نشد')
    if (skill.status !== SkillStatus.ACTIVE) {
      throw new BadRequestException('این مهارت فعال نیست')
    }

    // Upsert: if student already has this skill, update; otherwise create
    const existing = await this.db.studentSkill.findFirst({
      where: { studentId, skillId: dto.skillId },
    })

    let row: any

    if (existing) {
      // Update existing skill record
      row = await this.db.studentSkill.update({
        where: { id: existing.id },
        data: {
          level: dto.level,
          evidenceNote: dto.evidenceNote ?? existing.evidenceNote,
          sourceType: dto.sourceType ?? existing.sourceType,
          sourceId: dto.sourceId ?? existing.sourceId,
          awardedById: actorId,
          awardedAt: new Date(),
        },
        include: {
          skill: { select: { title: true, category: true, level: true } },
          awardedBy: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })

      // Write SKILL_UPDATED timeline event
      await this.writeTimeline(studentId, actorId, TimelineEventType.SKILL_UPDATED, {
        skillId: dto.skillId,
        skillTitle: skill.title,
        newLevel: dto.level,
      }, `سطح مهارت «${skill.title}» به‌روزرسانی شد`)
    } else {
      // Create new student skill
      row = await this.db.studentSkill.create({
        data: {
          studentId,
          skillId: dto.skillId,
          level: dto.level,
          evidenceNote: dto.evidenceNote ?? null,
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          awardedById: actorId,
          awardedAt: new Date(),
        },
        include: {
          skill: { select: { title: true, category: true, level: true } },
          awardedBy: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })

      // Write SKILL_AWARDED timeline event
      await this.writeTimeline(studentId, actorId, TimelineEventType.SKILL_AWARDED, {
        skillId: dto.skillId,
        skillTitle: skill.title,
        level: dto.level,
      }, `مهارت «${skill.title}» به دانشجو اعطا شد`)
    }

    return this.toStudentSkillDto(row)
  }

  async removeSkill(studentId: string, studentSkillId: string): Promise<void> {
    await this.assertStudentExists(studentId)

    const row = await this.db.studentSkill.findFirst({
      where: { id: studentSkillId, studentId },
    })
    if (!row) throw new NotFoundException('مهارت دانشجو یافت نشد')

    await this.db.studentSkill.delete({ where: { id: studentSkillId } })
  }

  // ─── Student Credits ───────────────────────────────────────────────────────

  async getStudentCredits(studentId: string): Promise<StudentCreditDto[]> {
    await this.assertStudentExists(studentId)

    const rows = await this.db.studentCredit.findMany({
      where: { studentId },
      orderBy: { awardedAt: 'desc' },
      include: {
        credit: { select: { title: true, type: true, expiresAfterDays: true } },
        awardedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        revokedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    return rows.map((r: any) => this.toStudentCreditDto(r))
  }

  async awardCredit(
    studentId: string,
    dto: AwardCreditDto,
    actorId: string,
  ): Promise<StudentCreditDto> {
    await this.assertStudentExists(studentId)

    // Validate credit exists and is active
    const credit = await this.db.credit.findFirst({
      where: { id: dto.creditId, deletedAt: null },
    })
    if (!credit) throw new NotFoundException('اعتبار یافت نشد')
    if (credit.status !== CreditStatus.ACTIVE) {
      throw new BadRequestException('این اعتبار فعال نیست')
    }

    // Compute expiresAt: from dto, or from credit.expiresAfterDays, or null
    let expiresAt: Date | null = null
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt)
    } else if (credit.expiresAfterDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + credit.expiresAfterDays)
    }

    const row = await this.db.studentCredit.create({
      data: {
        studentId,
        creditId: dto.creditId,
        status: StudentCreditStatus.ACTIVE,
        evidenceNote: dto.evidenceNote ?? null,
        sourceType: dto.sourceType ?? null,
        sourceId: dto.sourceId ?? null,
        awardedById: actorId,
        awardedAt: new Date(),
        expiresAt,
      },
      include: {
        credit: { select: { title: true, type: true, expiresAfterDays: true } },
        awardedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        revokedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    // Write CREDIT_AWARDED timeline event
    await this.writeTimeline(studentId, actorId, TimelineEventType.CREDIT_AWARDED, {
      creditId: dto.creditId,
      creditTitle: credit.title,
      expiresAt: expiresAt?.toISOString() ?? null,
    }, `اعتبار «${credit.title}» به دانشجو اعطا شد`)

    return this.toStudentCreditDto(row)
  }

  async revokeCredit(
    studentId: string,
    studentCreditId: string,
    actorId: string,
    dto?: RevokeCreditDto,
  ): Promise<StudentCreditDto> {
    await this.assertStudentExists(studentId)

    const row = await this.db.studentCredit.findFirst({
      where: { id: studentCreditId, studentId },
      include: {
        credit: { select: { title: true, type: true, expiresAfterDays: true } },
      },
    })
    if (!row) throw new NotFoundException('اعتبار دانشجو یافت نشد')

    if (row.status === StudentCreditStatus.REVOKED) {
      throw new BadRequestException('این اعتبار قبلاً لغو شده است')
    }

    const updated = await this.db.studentCredit.update({
      where: { id: studentCreditId },
      data: {
        status: StudentCreditStatus.REVOKED,
        revokedAt: new Date(),
        revokedById: actorId,
        ...(dto?.reason !== undefined && { evidenceNote: dto.reason }),
      },
      include: {
        credit: { select: { title: true, type: true, expiresAfterDays: true } },
        awardedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        revokedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    // Write CREDIT_REVOKED timeline event
    await this.writeTimeline(studentId, actorId, TimelineEventType.CREDIT_REVOKED, {
      creditId: row.creditId,
      creditTitle: row.credit?.title,
      reason: dto?.reason ?? null,
    }, `اعتبار «${row.credit?.title}» لغو شد`)

    return this.toStudentCreditDto(updated)
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async assertStudentExists(studentId: string): Promise<void> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
    })
    if (!student) throw new NotFoundException('دانشجو یافت نشد')
  }

  private async writeTimeline(
    studentId: string,
    actorId: string,
    eventType: TimelineEventType,
    metadata: Record<string, unknown>,
    title: string,
  ): Promise<void> {
    await this.db.studentTimelineEvent.create({
      data: {
        studentId,
        eventType,
        actorId,
        title,
        metadata,
        isManual: false,
      },
    })
  }

  private toStudentSkillDto(row: any): StudentSkillDto {
    const awardedByProfile = row.awardedBy?.profile
    const awardedByName = awardedByProfile
      ? `${awardedByProfile.firstName} ${awardedByProfile.lastName}`.trim()
      : row.awardedById

    return {
      id: row.id,
      studentId: row.studentId,
      skillId: row.skillId,
      skillTitle: row.skill?.title ?? '',
      skillCategory: row.skill?.category ?? null,
      skillLevel: row.skill?.level,
      level: row.level as StudentSkillLevel,
      sourceType: row.sourceType ?? null,
      sourceId: row.sourceId ?? null,
      awardedById: row.awardedById,
      awardedByName,
      awardedAt: (row.awardedAt as Date).toISOString(),
      evidenceNote: row.evidenceNote ?? null,
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    }
  }

  private toStudentCreditDto(row: any): StudentCreditDto {
    const awardedByProfile = row.awardedBy?.profile
    const awardedByName = awardedByProfile
      ? `${awardedByProfile.firstName} ${awardedByProfile.lastName}`.trim()
      : row.awardedById

    const revokedByProfile = row.revokedBy?.profile
    const revokedByName = revokedByProfile
      ? `${revokedByProfile.firstName} ${revokedByProfile.lastName}`.trim()
      : row.revokedById ?? null

    return {
      id: row.id,
      studentId: row.studentId,
      creditId: row.creditId,
      creditTitle: row.credit?.title ?? '',
      creditType: row.credit?.type,
      status: row.status as StudentCreditStatus,
      sourceType: row.sourceType ?? null,
      sourceId: row.sourceId ?? null,
      awardedById: row.awardedById,
      awardedByName,
      awardedAt: (row.awardedAt as Date).toISOString(),
      expiresAt: row.expiresAt ? (row.expiresAt as Date).toISOString() : null,
      revokedAt: row.revokedAt ? (row.revokedAt as Date).toISOString() : null,
      revokedById: row.revokedById ?? null,
      revokedByName,
      evidenceNote: row.evidenceNote ?? null,
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    }
  }
}
