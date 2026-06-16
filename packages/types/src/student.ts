import type { StudentStatus, TimelineEventType } from './enums.js'

export interface StudentTimelineEventDto {
  id: string
  studentId: string
  eventType: TimelineEventType
  actorId: string | null
  actorName: string | null
  title: string
  metadata: Record<string, unknown> | null
  isManual: boolean
  createdAt: string
}

export interface StudentDto {
  id: string
  userId: string
  studentCode: string
  originApplicantId: string | null
  status: StudentStatus
  internalNotes: string | null
  createdAt: string
  updatedAt: string
  // Joined from User + Profile
  firstName: string
  lastName: string
  fullName: string
  mobile: string
  email: string | null
  city: string | null
  avatarUrl: string | null
  // Joined from originApplicant (علاقه‌مندی ثبت‌شده)
  interestedCourseName: string | null
  interestedCourseId: string | null
  interestedCourseGroupId: string | null
  interestedCourseGroupName: string | null
  interestedTopic: string | null
  timeline?: StudentTimelineEventDto[]
}

export interface PaginatedStudents {
  data: StudentDto[]
  total: number
  page: number
  limit: number
}
