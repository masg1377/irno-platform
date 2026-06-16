import { cookies } from 'next/headers'
import type {
  UserWithProfileDto,
  AppModuleDto,
  PaginatedApplicants,
  ApplicantDto,
  PaginatedStudents,
  StudentDto,
  NeedsFollowUpItemDto,
  OverdueInstallmentItemDto,
  FinanceBalancesDto,
  EnrollmentSummaryDto,
  CrmSummaryDto,
  PaginatedNotifications,
  UnreadCountDto,
  NotificationPreferenceDto,
  NotificationTemplateDto,
  PaginatedNotificationDeliveries,
  EventDto,
  PaginatedEvents,
  EventRegistrationDto,
  PaginatedEventRegistrations,
  EventPaymentTransactionDto,
  EventEligibilityRuleDto,
  EligibilityCheckResult,
  EventReminderDto,
  EventReportDto,
  EventsSummaryDto,
  MeetinoMeetingReferenceDto,
  MeetinoIntegrationStatusDto,
  MeetinoAttendanceRecordDto,
  // Portal types
  PortalMeDto,
  PortalApplicantSummaryDto,
  PortalStudentSummaryDto,
  PortalEnrollmentDto,
  PortalPaymentDto,
  PortalInstallmentDto,
  PortalEventItemDto,
  PortalMeetinoLinkDto,
} from '@irno/types'

/**
 * Server-side API helpers for hub-web server components.
 *
 * These functions call hub-api DIRECTLY (server-to-server) using HUB_API_URL.
 * They do NOT go through the /api/v1 proxy rewrite — that proxy is for client-side use.
 *
 * The access token cookie is forwarded from the incoming request so hub-api
 * can verify the user's identity.
 */

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function apiGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value

  if (!token) return null

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Do not cache — user-specific, must be fresh
      cache: 'no-store',
    })

    if (!res.ok) return null

    const json = (await res.json()) as { data: T }
    return json.data
  } catch {
    return null
  }
}

/**
 * Fetch the current user's profile.
 * Returns null if not authenticated or token is invalid.
 * Used in server components to guard protected pages.
 */
export async function getMe(): Promise<UserWithProfileDto | null> {
  return apiGet<UserWithProfileDto>('/auth/me')
}

/**
 * Fetch the app launcher list for the current user's role.
 */
export async function getApps(): Promise<AppModuleDto[]> {
  const apps = await apiGet<AppModuleDto[]>('/apps')
  return apps ?? []
}

// ─── Applicants ───────────────────────────────────────────────────────────────

export async function getApplicants(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedApplicants> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<PaginatedApplicants>(`/applicants${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getApplicant(id: string): Promise<ApplicantDto | null> {
  return apiGet<ApplicantDto>(`/applicants/${id}`)
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudents(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedStudents> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<PaginatedStudents>(`/students${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getStudent(id: string): Promise<StudentDto | null> {
  return apiGet<StudentDto>(`/students/${id}`)
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses(params?: {
  search?: string
  status?: string
  level?: string
  category?: string
  categoryId?: string
  page?: number
  limit?: number
}): Promise<import('@irno/types').PaginatedCourses> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  if (params?.level) qs.set('level', params.level)
  if (params?.category) qs.set('category', params.category)
  if (params?.categoryId) qs.set('categoryId', params.categoryId)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<import('@irno/types').PaginatedCourses>(`/courses${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getCourse(id: string): Promise<import('@irno/types').CourseDto | null> {
  return apiGet<import('@irno/types').CourseDto>(`/courses/${id}`)
}

// ─── Course Groups ────────────────────────────────────────────────────────────

export async function getCourseGroups(params?: {
  search?: string
  courseId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<import('@irno/types').PaginatedCourseGroups> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.courseId) qs.set('courseId', params.courseId)
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<import('@irno/types').PaginatedCourseGroups>(`/groups${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getCourseGroup(id: string): Promise<import('@irno/types').CourseGroupDto | null> {
  return apiGet<import('@irno/types').CourseGroupDto>(`/groups/${id}`)
}

// ─── Enrollments ──────────────────────────────────────────────

export async function getEnrollments(params?: {
  studentId?: string
  courseId?: string
  courseGroupId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<import('@irno/types').PaginatedEnrollments> {
  const qs = new URLSearchParams()
  if (params?.studentId) qs.set('studentId', params.studentId)
  if (params?.courseId) qs.set('courseId', params.courseId)
  if (params?.courseGroupId) qs.set('courseGroupId', params.courseGroupId)
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<import('@irno/types').PaginatedEnrollments>(`/enrollments${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getEnrollment(id: string): Promise<import('@irno/types').EnrollmentDto | null> {
  return apiGet<import('@irno/types').EnrollmentDto>(`/enrollments/${id}`)
}

// ─── Payments ─────────────────────────────────────────────────

export async function getPayments(params?: {
  status?: string
  studentId?: string
  overdue?: boolean
  page?: number
  limit?: number
}): Promise<import('@irno/types').PaginatedPayments> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.studentId) qs.set('studentId', params.studentId)
  if (params?.overdue) qs.set('overdue', 'true')
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<import('@irno/types').PaginatedPayments>(`/payments${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getPayment(id: string): Promise<import('@irno/types').PaymentDto | null> {
  return apiGet<import('@irno/types').PaymentDto>(`/payments/${id}`)
}

export async function getFinanceSummary(): Promise<import('@irno/types').FinanceSummaryDto | null> {
  return apiGet<import('@irno/types').FinanceSummaryDto>('/payments/finance-summary')
}

// ─── Reports ──────────────────────────────────────────────────

export async function getReportFollowUps(): Promise<NeedsFollowUpItemDto[]> {
  const result = await apiGet<NeedsFollowUpItemDto[]>('/reports/students/needs-follow-up')
  return result ?? []
}

export async function getReportOverdueInstallments(): Promise<OverdueInstallmentItemDto[]> {
  const result = await apiGet<OverdueInstallmentItemDto[]>('/reports/finance/overdue-installments')
  return result ?? []
}

export async function getReportFinanceBalances(): Promise<FinanceBalancesDto | null> {
  return apiGet<FinanceBalancesDto>('/reports/finance/balances')
}

export async function getReportEnrollmentSummary(): Promise<EnrollmentSummaryDto | null> {
  return apiGet<EnrollmentSummaryDto>('/reports/enrollments/summary')
}

export async function getReportCrmSummary(): Promise<CrmSummaryDto | null> {
  return apiGet<CrmSummaryDto>('/reports/crm/summary')
}

// ─── Notifications ────────────────────────────────────────────

export async function getMyNotifications(params?: {
  unreadOnly?: boolean
  type?: string
  page?: number
  limit?: number
}): Promise<PaginatedNotifications> {
  const qs = new URLSearchParams()
  if (params?.unreadOnly) qs.set('unreadOnly', 'true')
  if (params?.type) qs.set('type', params.type)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<PaginatedNotifications>(`/notifications${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getUnreadCount(): Promise<UnreadCountDto> {
  const result = await apiGet<UnreadCountDto>('/notifications/unread-count')
  return result ?? { count: 0 }
}

export async function getMyPreferences(): Promise<NotificationPreferenceDto | null> {
  return apiGet<NotificationPreferenceDto>('/notification-preferences/me')
}

export async function getNotificationTemplates(): Promise<NotificationTemplateDto[]> {
  const result = await apiGet<NotificationTemplateDto[]>('/admin/notification-templates')
  return result ?? []
}

export async function getNotificationDeliveries(params?: {
  status?: string
  channel?: string
  page?: number
  limit?: number
}): Promise<PaginatedNotificationDeliveries> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.channel) qs.set('channel', params.channel)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<PaginatedNotificationDeliveries>(`/admin/notifications/deliveries${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

// ─── Events ───────────────────────────────────────────────────

export async function getEvents(params?: {
  type?: string
  deliveryMode?: string
  registrationMode?: string
  status?: string
  search?: string
  fromDate?: string
  toDate?: string
  page?: number
  limit?: number
}): Promise<PaginatedEvents> {
  const qs = new URLSearchParams()
  if (params?.type) qs.set('type', params.type)
  if (params?.deliveryMode) qs.set('deliveryMode', params.deliveryMode)
  if (params?.registrationMode) qs.set('registrationMode', params.registrationMode)
  if (params?.status) qs.set('status', params.status)
  if (params?.search) qs.set('search', params.search)
  if (params?.fromDate) qs.set('fromDate', params.fromDate)
  if (params?.toDate) qs.set('toDate', params.toDate)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<PaginatedEvents>(`/events${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 20 }
}

export async function getEvent(id: string): Promise<EventDto | null> {
  return apiGet<EventDto>(`/events/${id}`)
}

export async function getEventRegistrations(eventId: string, params?: {
  status?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedEventRegistrations> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus)
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const result = await apiGet<PaginatedEventRegistrations>(`/events/${eventId}/registrations${query}`)
  return result ?? { data: [], total: 0, page: 1, limit: 50 }
}

export async function getEventRegistration(eventId: string, registrationId: string): Promise<EventRegistrationDto | null> {
  return apiGet<EventRegistrationDto>(`/events/${eventId}/registrations/${registrationId}`)
}

export async function getEventPayments(eventId: string, registrationId: string): Promise<EventPaymentTransactionDto[]> {
  const result = await apiGet<EventPaymentTransactionDto[]>(`/events/${eventId}/registrations/${registrationId}/payments`)
  return result ?? []
}

export async function getEventEligibilityRules(eventId: string): Promise<EventEligibilityRuleDto[]> {
  const result = await apiGet<EventEligibilityRuleDto[]>(`/events/${eventId}/eligibility-rules`)
  return result ?? []
}

export async function getEventReminders(eventId: string): Promise<EventReminderDto[]> {
  const result = await apiGet<EventReminderDto[]>(`/events/${eventId}/reminders`)
  return result ?? []
}

export async function getEventReport(eventId: string): Promise<EventReportDto | null> {
  return apiGet<EventReportDto>(`/events/${eventId}/report`)
}

export async function getReportEventsSummary(): Promise<EventsSummaryDto | null> {
  return apiGet<EventsSummaryDto>('/reports/events/summary')
}

// ─── Meetino Integration ──────────────────────────────────────────────────────

export async function getMeetinoIntegrationStatus(): Promise<MeetinoIntegrationStatusDto | null> {
  return apiGet<MeetinoIntegrationStatusDto>('/integrations/meetino/status')
}

export async function getGroupMeetinoReference(groupId: string): Promise<MeetinoMeetingReferenceDto | null> {
  return apiGet<MeetinoMeetingReferenceDto>(`/groups/${groupId}/meetino`)
}

export async function getGroupMeetinoAttendance(groupId: string): Promise<MeetinoAttendanceRecordDto[]> {
  const result = await apiGet<MeetinoAttendanceRecordDto[]>(`/groups/${groupId}/meetino/attendance`)
  return result ?? []
}

export async function getEventMeetinoReference(eventId: string): Promise<MeetinoMeetingReferenceDto | null> {
  return apiGet<MeetinoMeetingReferenceDto>(`/events/${eventId}/meetino`)
}

export async function getEventMeetinoAttendance(eventId: string): Promise<MeetinoAttendanceRecordDto[]> {
  const result = await apiGet<MeetinoAttendanceRecordDto[]>(`/events/${eventId}/meetino/attendance`)
  return result ?? []
}

// ─── Portal ───────────────────────────────────────────────────────────────────

export async function getPortalMe(): Promise<PortalMeDto | null> {
  return apiGet<PortalMeDto>('/portal/me')
}

export async function getPortalApplicant(): Promise<PortalApplicantSummaryDto | null> {
  return apiGet<PortalApplicantSummaryDto>('/portal/applicant')
}

export async function getPortalStudent(): Promise<PortalStudentSummaryDto | null> {
  return apiGet<PortalStudentSummaryDto>('/portal/student')
}

export async function getPortalEnrollments(): Promise<PortalEnrollmentDto[]> {
  const result = await apiGet<PortalEnrollmentDto[]>('/portal/enrollments')
  return result ?? []
}

export async function getPortalPayments(): Promise<PortalPaymentDto[]> {
  const result = await apiGet<PortalPaymentDto[]>('/portal/payments')
  return result ?? []
}

export async function getPortalInstallments(): Promise<PortalInstallmentDto[]> {
  const result = await apiGet<PortalInstallmentDto[]>('/portal/installments')
  return result ?? []
}

export async function getPortalEvents(): Promise<PortalEventItemDto[]> {
  const result = await apiGet<PortalEventItemDto[]>('/portal/events')
  return result ?? []
}

export async function getPortalMeetinoLinks(): Promise<PortalMeetinoLinkDto[]> {
  const result = await apiGet<PortalMeetinoLinkDto[]>('/portal/meetino-links')
  return result ?? []
}

export async function getPortalSkills(): Promise<import('@irno/types').PortalSkillDto[]> {
  const result = await apiGet<import('@irno/types').PortalSkillDto[]>('/portal/skills')
  return result ?? []
}

export async function getPortalCredits(): Promise<import('@irno/types').PortalCreditDto[]> {
  const result = await apiGet<import('@irno/types').PortalCreditDto[]>('/portal/credits')
  return result ?? []
}

// Suppress unused-import warnings — these types are re-exported for use by pages
export type {
  EventDto, PaginatedEvents, EventRegistrationDto, PaginatedEventRegistrations,
  EventPaymentTransactionDto, EventEligibilityRuleDto, EligibilityCheckResult,
  EventReminderDto, EventReportDto, EventsSummaryDto,
  MeetinoMeetingReferenceDto, MeetinoIntegrationStatusDto, MeetinoAttendanceRecordDto,
  // Portal
  PortalMeDto, PortalApplicantSummaryDto, PortalStudentSummaryDto,
  PortalEnrollmentDto, PortalPaymentDto, PortalInstallmentDto,
  PortalEventItemDto, PortalMeetinoLinkDto,
}
