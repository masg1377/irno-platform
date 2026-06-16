import type { CourseLevel, CourseStatus } from './enums.js'

export interface CourseDto {
  id: string
  title: string
  slug: string
  description: string | null
  category: string | null        // legacy free-text category (kept for backward compat)
  categoryId: string | null      // structured taxonomy FK
  categoryTitle: string | null   // resolved title from taxonomy term (denormalized for display)
  level: CourseLevel
  defaultTuitionToman: number | null
  status: CourseStatus
  groupCount?: number
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedCourses {
  data: CourseDto[]
  total: number
  page: number
  limit: number
}
