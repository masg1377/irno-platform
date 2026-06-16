import type { CourseGroupStatus } from './enums.js'

export interface CourseGroupMentorDto {
  userId: string
  name: string
  assignedAt: string
}

export interface CourseGroupDto {
  id: string
  courseId: string
  courseName: string
  name: string
  teacherId: string | null
  teacherName: string | null
  startDate: string | null
  endDate: string | null
  scheduleNotes: string | null
  capacity: number | null
  status: CourseGroupStatus
  meetinoRoomId: string | null
  mentors: CourseGroupMentorDto[]
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedCourseGroups {
  data: CourseGroupDto[]
  total: number
  page: number
  limit: number
}
