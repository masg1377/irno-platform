import type {
  UserRole,
  UserStatus,
  ApplicantStatus,
  ApplicantSource,
  StudentStatus,
  EnrollmentStatus,
  PaymentStatus,
  InstallmentStatus,
  EventType,
  EventDeliveryMode,
  EventStatus,
  EventRegistrationStatus,
  MeetinoMeetingSourceType,
  MeetinoMeetingStatus,
} from './enums.js'
import type { ProfileDto } from './user.js'

// ── Section keys available in the portal ────────────────────────────────────

export type PortalSection =
  | 'profile'
  | 'applicant_status'
  | 'enrollments'
  | 'payments'
  | 'installments'
  | 'events'
  | 'meetino'
  | 'notifications'
  | 'skills'
  | 'credits'

// ── Portal /me ────────────────────────────────────────────────────────────────

export interface PortalMeDto {
  id: string
  mobile: string
  email: string | null
  role: UserRole
  status: UserStatus
  /** Safe boolean — true if user has a password set. passwordHash is never exposed. */
  hasPassword: boolean
  profile: ProfileDto | null
  applicantSummary: PortalApplicantSummaryDto | null
  studentSummary: PortalStudentSummaryDto | null
  /** Which portal sections this user can access */
  availableSections: PortalSection[]
}

// ── Applicant summary ────────────────────────────────────────────────────────

export interface PortalApplicantSummaryDto {
  id: string
  status: ApplicantStatus
  source: ApplicantSource
  interestedTopic: string | null
  interestedCourseId: string | null
  interestedCourseName: string | null
  createdAt: string
  /** Persian-language next-steps hint based on status */
  nextSteps: string
}

// ── Student summary ───────────────────────────────────────────────────────────

export interface PortalStudentSummaryDto {
  id: string
  studentCode: string
  status: StudentStatus
  activeEnrollmentsCount: number
  createdAt: string
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export interface PortalEnrollmentDto {
  id: string
  enrollmentDate: string
  status: EnrollmentStatus
  course: { id: string; title: string; slug: string }
  courseGroup: { id: string; name: string } | null
  /** Join URL if a Meetino meeting is linked to the course group */
  meetinoJoinUrl: string | null
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface PortalPaymentDto {
  id: string
  totalAmountToman: number
  paidAmountToman: number
  remainingAmountToman: number
  status: PaymentStatus
  courseName: string | null
  courseGroupName: string | null
  enrollmentId: string
}

// ── Installments ──────────────────────────────────────────────────────────────

export interface PortalInstallmentDto {
  id: string
  amountToman: number
  dueDate: string
  status: InstallmentStatus
  courseName: string | null
  courseGroupName: string | null
  paymentId: string
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface PortalEventItemDto {
  id: string
  title: string
  description: string | null
  eventType: EventType
  deliveryMode: EventDeliveryMode
  registrationMode: string
  startAt: string
  endAt: string | null
  status: EventStatus
  /** null if user is browsing available events (not yet registered) */
  registrationStatus: EventRegistrationStatus | null
  registrationId: string | null
  /** Join URL from Meetino if this is an online/hybrid event and user is registered */
  meetinoJoinUrl: string | null
  isRegistered: boolean
}

// ── Meetino links ─────────────────────────────────────────────────────────────

export interface PortalMeetinoLinkDto {
  id: string
  title: string
  sourceType: MeetinoMeetingSourceType
  sourceId: string
  /** Human label for the source — e.g. course group name or event title */
  sourceLabel: string
  joinUrl: string
  status: MeetinoMeetingStatus
  startsAt: string | null
}

// ── Profile update ────────────────────────────────────────────────────────────

export interface UpdatePortalProfileDto {
  firstName?: string
  lastName?: string
  email?: string | null
  city?: string | null
  avatarUrl?: string | null
}
