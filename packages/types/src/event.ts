import type {
  EventType,
  EventDeliveryMode,
  EventRegistrationMode,
  EventStatus,
  EventRegistrationStatus,
  EventRegistrationPaymentStatus,
  EventEligibilityRuleType,
  EventReminderType,
  EventReminderStatus,
  NotificationChannel,
  PaymentMethod,
} from './enums.js'

// ── Event ─────────────────────────────────────────────────────

export interface EventDto {
  id: string
  title: string
  slug: string
  description: string | null
  type: EventType
  deliveryMode: EventDeliveryMode
  registrationMode: EventRegistrationMode
  status: EventStatus
  startsAt: string
  endsAt: string | null
  location: string | null
  onlineUrl: string | null
  meetinoMeetingId: string | null
  meetinoJoinUrl: string | null
  capacity: number | null
  priceToman: number
  registrationDeadline: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  // computed
  registrationCount: number
  approvedCount: number
  attendedCount: number
}

export interface PaginatedEvents {
  data: EventDto[]
  total: number
  page: number
  limit: number
}

// ── Event Registration ────────────────────────────────────────

export interface EventRegistrationDto {
  id: string
  eventId: string
  userId: string | null
  studentId: string | null
  applicantId: string | null
  fullName: string
  mobile: string
  email: string | null
  status: EventRegistrationStatus
  paymentStatus: EventRegistrationPaymentStatus
  amountDueToman: number
  paidAmountToman: number
  remainingAmountToman: number
  registeredAt: string
  checkedInAt: string | null
  cancelledAt: string | null
  notes: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedEventRegistrations {
  data: EventRegistrationDto[]
  total: number
  page: number
  limit: number
}

// ── Event Payment Transaction ─────────────────────────────────

export interface EventPaymentTransactionDto {
  id: string
  eventRegistrationId: string
  amountToman: number
  method: PaymentMethod
  paidAt: string
  receiptNote: string | null
  recordedById: string
  createdAt: string
}

// ── Event Eligibility Rule ────────────────────────────────────

export interface EventEligibilityRuleDto {
  id: string
  eventId: string
  type: EventEligibilityRuleType
  operator: string | null
  value: Record<string, unknown> | null
  isRequired: boolean
  createdAt: string
  updatedAt: string
}

// ── Event Reminder ────────────────────────────────────────────

export interface EventReminderDto {
  id: string
  eventId: string
  type: EventReminderType
  scheduledAt: string
  channel: NotificationChannel
  status: EventReminderStatus
  notificationTemplateId: string | null
  createdAt: string
  updatedAt: string
}

// ── Event Report ──────────────────────────────────────────────

export interface EventReportDto {
  eventId: string
  totalRegistrations: number
  approvedCount: number
  waitlistedCount: number
  attendedCount: number
  noShowCount: number
  paidCount: number
  unpaidCount: number
  totalExpectedRevenueToman: number
  totalPaidToman: number
  remainingToman: number
}

export interface EventsSummaryDto {
  totalEvents: number
  upcomingEvents: number
  liveEvents: number
  completedEvents: number
  paidEvents: number
  freeEvents: number
  registrationsThisMonth: number
  eventRevenueToman: number
}
