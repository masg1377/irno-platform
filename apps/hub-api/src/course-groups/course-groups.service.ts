import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole, CourseGroupStatus } from '@irno/types'
import type { CurrentUser, CourseGroupDto, CourseGroupMentorDto, PaginatedCourseGroups } from '@irno/types'
import type { CreateCourseGroupDto } from './dto/create-course-group.dto'
import type { UpdateCourseGroupDto } from './dto/update-course-group.dto'
import type { AssignMentorDto } from './dto/assign-mentor.dto'

interface ListGroupsOptions {
  search?: string
  courseId?: string
  teacherId?: string
  status?: CourseGroupStatus
  page?: number
  limit?: number
  viewerRole: UserRole
  viewerUserId: string
}

const GROUP_INCLUDE = {
  course: { select: { id: true, title: true } },
  teacher: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
  mentors: {
    include: {
      user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
    },
  },
} as const

@Injectable()
export class CourseGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ──────────────────────────────────────────────────

  async findAll(options: ListGroupsOptions): Promise<PaginatedCourseGroups> {
    const { search, courseId, teacherId, status, page = 1, limit = 20, viewerRole, viewerUserId } = options
    const skip = (page - 1) * limit

    // TEACHER sees only own groups; MENTOR sees groups they are assigned to
    let visibilityFilter = {}
    if (viewerRole === UserRole.TEACHER) {
      visibilityFilter = { teacherId: viewerUserId }
    } else if (viewerRole === UserRole.MENTOR) {
      visibilityFilter = { mentors: { some: { userId: viewerUserId } } }
    }

    const where = {
      deletedAt: null,
      ...visibilityFilter,
      ...(courseId ? { courseId } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { course: { is: { title: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.courseGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        include: GROUP_INCLUDE,
      }),
      this.prisma.courseGroup.count({ where }),
    ])

    return {
      data: data.map((g) => this.toGroupDto(g)),
      total,
      page,
      limit,
    }
  }

  // ─── Find mine ─────────────────────────────────────────────

  async findMine(viewer: CurrentUser): Promise<CourseGroupDto[]> {
    const where =
      viewer.role === UserRole.TEACHER
        ? { teacherId: viewer.id, deletedAt: null }
        : { mentors: { some: { userId: viewer.id } }, deletedAt: null }

    const groups = await this.prisma.courseGroup.findMany({
      where,
      orderBy: [{ startDate: 'asc' }],
      include: GROUP_INCLUDE,
    })
    return groups.map((g) => this.toGroupDto(g))
  }

  // ─── Find one ──────────────────────────────────────────────

  async findOne(id: string, viewer: CurrentUser): Promise<CourseGroupDto> {
    const group = await this.prisma.courseGroup.findFirst({
      where: { id, deletedAt: null },
      include: GROUP_INCLUDE,
    })
    if (!group) throw new NotFoundException('گروه یافت نشد')

    // Access check for TEACHER and MENTOR
    if (viewer.role === UserRole.TEACHER && group.teacherId !== viewer.id) {
      throw new ForbiddenException('شما به این گروه دسترسی ندارید')
    }
    if (viewer.role === UserRole.MENTOR) {
      const isMentor = group.mentors.some((m) => m.userId === viewer.id)
      if (!isMentor) throw new ForbiddenException('شما به این گروه دسترسی ندارید')
    }

    return this.toGroupDto(group)
  }

  // ─── Create ────────────────────────────────────────────────

  async create(dto: CreateCourseGroupDto, actor: CurrentUser): Promise<CourseGroupDto> {
    // Validate course exists
    const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, deletedAt: null } })
    if (!course) throw new NotFoundException('دوره یافت نشد')

    // Validate teacher role
    if (dto.teacherId) {
      await this.assertTeacherRole(dto.teacherId)
    }

    // Validate dates
    if (dto.startDate && dto.endDate && new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException('تاریخ پایان باید بعد از تاریخ شروع باشد')
    }

    const group = await this.prisma.courseGroup.create({
      data: {
        courseId: dto.courseId,
        name: dto.name,
        teacherId: dto.teacherId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        scheduleNotes: dto.scheduleNotes ?? null,
        capacity: dto.capacity ?? null,
        status: dto.status ?? CourseGroupStatus.UPCOMING,
        meetinoRoomId: dto.meetinoRoomId ?? null,
        createdById: actor.id,
      },
      include: GROUP_INCLUDE,
    })

    return this.toGroupDto(group)
  }

  // ─── Update ────────────────────────────────────────────────

  async update(id: string, dto: UpdateCourseGroupDto): Promise<CourseGroupDto> {
    const group = await this.prisma.courseGroup.findFirst({ where: { id, deletedAt: null } })
    if (!group) throw new NotFoundException('گروه یافت نشد')

    if (dto.teacherId) {
      await this.assertTeacherRole(dto.teacherId)
    }

    const startDate = dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : group.startDate
    const endDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : group.endDate
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('تاریخ پایان باید بعد از تاریخ شروع باشد')
    }

    const updated = await this.prisma.courseGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.scheduleNotes !== undefined && { scheduleNotes: dto.scheduleNotes }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.meetinoRoomId !== undefined && { meetinoRoomId: dto.meetinoRoomId }),
      },
      include: GROUP_INCLUDE,
    })

    return this.toGroupDto(updated)
  }

  // ─── Remove ────────────────────────────────────────────────

  async remove(id: string): Promise<{ message: string }> {
    const group = await this.prisma.courseGroup.findFirst({ where: { id, deletedAt: null } })
    if (!group) throw new NotFoundException('گروه یافت نشد')

    // Cancel if active/upcoming, soft delete otherwise
    if (group.status === CourseGroupStatus.UPCOMING || group.status === CourseGroupStatus.ACTIVE) {
      await this.prisma.courseGroup.update({ where: { id }, data: { status: CourseGroupStatus.CANCELLED } })
      return { message: 'گروه لغو شد' }
    }

    await this.prisma.courseGroup.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'گروه با موفقیت حذف شد' }
  }

  // ─── Mentor assignment ─────────────────────────────────────

  async assignMentor(groupId: string, dto: AssignMentorDto): Promise<CourseGroupDto> {
    const group = await this.prisma.courseGroup.findFirst({ where: { id: groupId, deletedAt: null } })
    if (!group) throw new NotFoundException('گروه یافت نشد')

    await this.assertMentorRole(dto.mentorUserId)

    const existing = await this.prisma.courseGroupMentor.findUnique({
      where: { courseGroupId_userId: { courseGroupId: groupId, userId: dto.mentorUserId } },
    })
    if (existing) throw new ConflictException('این منتور قبلاً به این گروه اضافه شده است')

    await this.prisma.courseGroupMentor.create({
      data: { courseGroupId: groupId, userId: dto.mentorUserId },
    })

    const updated = await this.prisma.courseGroup.findFirst({
      where: { id: groupId },
      include: GROUP_INCLUDE,
    })
    return this.toGroupDto(updated!)
  }

  async removeMentor(groupId: string, userId: string): Promise<CourseGroupDto> {
    const group = await this.prisma.courseGroup.findFirst({ where: { id: groupId, deletedAt: null } })
    if (!group) throw new NotFoundException('گروه یافت نشد')

    const assignment = await this.prisma.courseGroupMentor.findUnique({
      where: { courseGroupId_userId: { courseGroupId: groupId, userId } },
    })
    if (!assignment) throw new NotFoundException('این منتور در این گروه وجود ندارد')

    await this.prisma.courseGroupMentor.delete({
      where: { courseGroupId_userId: { courseGroupId: groupId, userId } },
    })

    const updated = await this.prisma.courseGroup.findFirst({
      where: { id: groupId },
      include: GROUP_INCLUDE,
    })
    return this.toGroupDto(updated!)
  }

  // ─── Role validators ───────────────────────────────────────

  private async assertTeacherRole(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundException('کاربر یافت نشد')
    if (user.role !== UserRole.TEACHER) throw new BadRequestException('کاربر انتخاب‌شده باید نقش مدرس داشته باشد')
  }

  private async assertMentorRole(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundException('کاربر یافت نشد')
    if (user.role !== UserRole.MENTOR) throw new BadRequestException('کاربر انتخاب‌شده باید نقش منتور داشته باشد')
  }

  // ─── DTO mapper ────────────────────────────────────────────

  private toGroupDto(g: {
    id: string; courseId: string; name: string; teacherId: string | null
    startDate: Date | null; endDate: Date | null; scheduleNotes: string | null
    capacity: number | null; status: string; meetinoRoomId: string | null
    createdById: string; createdAt: Date; updatedAt: Date
    course: { id: string; title: string }
    teacher: { id: string; profile: { firstName: string; lastName: string } | null } | null
    mentors: { userId: string; assignedAt: Date; user: { id: string; profile: { firstName: string; lastName: string } | null } }[]
  }): CourseGroupDto {
    return {
      id: g.id,
      courseId: g.courseId,
      courseName: g.course.title,
      name: g.name,
      teacherId: g.teacherId,
      teacherName: g.teacher?.profile
        ? `${g.teacher.profile.firstName} ${g.teacher.profile.lastName}`
        : null,
      startDate: g.startDate?.toISOString() ?? null,
      endDate: g.endDate?.toISOString() ?? null,
      scheduleNotes: g.scheduleNotes,
      capacity: g.capacity,
      status: g.status as CourseGroupStatus,
      meetinoRoomId: g.meetinoRoomId,
      mentors: g.mentors.map((m): CourseGroupMentorDto => ({
        userId: m.userId,
        name: m.user.profile
          ? `${m.user.profile.firstName} ${m.user.profile.lastName}`
          : m.userId,
        assignedAt: m.assignedAt.toISOString(),
      })),
      createdById: g.createdById,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }
  }
}
