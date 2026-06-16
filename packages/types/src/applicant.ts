import type { ApplicantStatus, ApplicantSource } from './enums.js'

export interface ApplicantNoteDto {
  id: string
  applicantId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}

export interface ApplicantDto {
  id: string
  fullName: string
  mobile: string
  email: string | null
  city: string | null
  source: ApplicantSource
  interestedTopic: string | null
  interestedCourseId: string | null
  interestedCourseName: string | null
  interestedCourseGroupId: string | null
  interestedCourseGroupName: string | null
  status: ApplicantStatus
  consultationNotes: string | null
  followUpDate: string | null
  assignedToUserId: string | null
  assignedToName: string | null
  convertedToStudentId: string | null
  convertedAt: string | null
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
  notes?: ApplicantNoteDto[]
}

export interface PaginatedApplicants {
  data: ApplicantDto[]
  total: number
  page: number
  limit: number
}
