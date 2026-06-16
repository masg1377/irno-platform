/**
 * User roles — enforced on backend, never trusted from frontend.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  TEACHER = 'TEACHER',
  MENTOR = 'MENTOR',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST',
  LEAD = 'LEAD',
  /** Publicly self-registered via Irno ID — not yet reviewed by staff. */
  APPLICANT = 'APPLICANT',
}

/**
 * User account lifecycle status.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

/**
 * Keys for apps in the Irno app launcher.
 * These map to AppModule.key in the database.
 */
export enum AppModuleKey {
  MEETINO = 'MEETINO',
  IRNO_CHAT = 'IRNO_CHAT',
  IRNO_LEARN = 'IRNO_LEARN',
  IRNO_PROJECTS = 'IRNO_PROJECTS',
  IRNO_AI = 'IRNO_AI',
}

/**
 * Visibility/availability of an app in the launcher.
 */
export enum AppModuleStatus {
  ACTIVE = 'ACTIVE',
  COMING_SOON = 'COMING_SOON',
  DISABLED = 'DISABLED',
}

// ── Phase 3: CRM enums ───────────────────────────────────────

export enum ApplicantStatus {
  NEW_APPLICANT = 'NEW_APPLICANT',
  CONTACTED = 'CONTACTED',
  CONSULTED = 'CONSULTED',
  READY_TO_REGISTER = 'READY_TO_REGISTER',
  REGISTERED = 'REGISTERED',
  NEEDS_FOLLOW_UP = 'NEEDS_FOLLOW_UP',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CANCELLED = 'CANCELLED',
}

export enum ApplicantSource {
  INSTAGRAM = 'INSTAGRAM',
  REFERRAL = 'REFERRAL',
  WEBSITE = 'WEBSITE',
  PHONE = 'PHONE',
  TELEGRAM = 'TELEGRAM',
  WHATSAPP = 'WHATSAPP',
  IN_PERSON = 'IN_PERSON',
  OTHER = 'OTHER',
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  GRADUATED = 'GRADUATED',
  CANCELLED = 'CANCELLED',
}

export enum TimelineEventType {
  APPLICANT_CREATED = 'APPLICANT_CREATED',
  APPLICANT_STATUS_CHANGED = 'APPLICANT_STATUS_CHANGED',
  APPLICANT_NOTE_ADDED = 'APPLICANT_NOTE_ADDED',
  APPLICANT_CONVERTED_TO_STUDENT = 'APPLICANT_CONVERTED_TO_STUDENT',
  STUDENT_CREATED = 'STUDENT_CREATED',
  STUDENT_NOTE_ADDED = 'STUDENT_NOTE_ADDED',
  STUDENT_STATUS_CHANGED = 'STUDENT_STATUS_CHANGED',
  // Phase 5
  ENROLLMENT_CREATED = 'ENROLLMENT_CREATED',
  ENROLLMENT_STATUS_CHANGED = 'ENROLLMENT_STATUS_CHANGED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  INSTALLMENT_CREATED = 'INSTALLMENT_CREATED',
  INSTALLMENT_OVERDUE = 'INSTALLMENT_OVERDUE',
  INSTALLMENT_PAID = 'INSTALLMENT_PAID',
  INSTALLMENT_WAIVED = 'INSTALLMENT_WAIVED',
  SYSTEM_NOTE = 'SYSTEM_NOTE',
  // Phase 9: Meetino
  MEETINO_SESSION_ATTENDED = 'MEETINO_SESSION_ATTENDED',
  MEETINO_SESSION_MISSED = 'MEETINO_SESSION_MISSED',
  // Phase 12: Skills & Credits
  SKILL_AWARDED = 'SKILL_AWARDED',
  SKILL_UPDATED = 'SKILL_UPDATED',
  CREDIT_AWARDED = 'CREDIT_AWARDED',
  CREDIT_REVOKED = 'CREDIT_REVOKED',
  CREDIT_EXPIRED = 'CREDIT_EXPIRED',
  // Phase 13: Certificates
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED',
}

export enum AssignmentTargetType {
  APPLICANT = 'APPLICANT',
  STUDENT = 'STUDENT',
}

// ── Phase 4: Academic enums ──────────────────────────────────

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ALL_LEVELS = 'ALL_LEVELS',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseGroupStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ── Phase 5: Finance enums ───────────────────────────────────

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  FREE = 'FREE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

// ── Phase 8: Event enums ─────────────────────────────────────

export enum EventType {
  WEBINAR = 'WEBINAR',
  CONFERENCE = 'CONFERENCE',
  FREE_DISCUSSION = 'FREE_DISCUSSION',
  WORKSHOP = 'WORKSHOP',
  GROUP_CONSULTATION = 'GROUP_CONSULTATION',
  OPEN_SESSION = 'OPEN_SESSION',
  CHALLENGE = 'CHALLENGE',
  OTHER = 'OTHER',
}

export enum EventDeliveryMode {
  ONLINE = 'ONLINE',
  IN_PERSON = 'IN_PERSON',
  HYBRID = 'HYBRID',
}

export enum EventRegistrationMode {
  FREE = 'FREE',
  PAID = 'PAID',
  INVITE_ONLY = 'INVITE_ONLY',
  INTERNAL_ONLY = 'INTERNAL_ONLY',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EventRegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  WAITLISTED = 'WAITLISTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
}

export enum EventRegistrationPaymentStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum EventEligibilityRuleType {
  ACTIVE_STUDENT_ONLY = 'ACTIVE_STUDENT_ONLY',
  SPECIFIC_COURSE = 'SPECIFIC_COURSE',
  SPECIFIC_COURSE_GROUP = 'SPECIFIC_COURSE_GROUP',
  COMPLETED_COURSE = 'COMPLETED_COURSE',
  NO_OVERDUE_PAYMENTS = 'NO_OVERDUE_PAYMENTS',
  STAFF_ONLY = 'STAFF_ONLY',
  PUBLIC = 'PUBLIC',
  MANUAL_APPROVAL_REQUIRED = 'MANUAL_APPROVAL_REQUIRED',
  SKILL_OR_CREDIT_PLACEHOLDER = 'SKILL_OR_CREDIT_PLACEHOLDER',
  // Phase 12: real checks
  REQUIRED_SKILL = 'REQUIRED_SKILL',
  REQUIRED_CREDIT = 'REQUIRED_CREDIT',
}

export enum EventReminderType {
  REGISTRATION_CONFIRMATION = 'REGISTRATION_CONFIRMATION',
  BEFORE_24_HOURS = 'BEFORE_24_HOURS',
  BEFORE_1_HOUR = 'BEFORE_1_HOUR',
  EVENT_STARTED = 'EVENT_STARTED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
}

export enum EventReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// ── Phase 7: Notification enums ──────────────────────────────

export enum NotificationType {
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
  REMINDER = 'REMINDER',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  TELEGRAM = 'TELEGRAM',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
  CANCELLED = 'CANCELLED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ── Phase 9: Meetino integration enums ──────────────────────

export enum MeetinoMeetingSourceType {
  COURSE_GROUP = 'COURSE_GROUP',
  EVENT = 'EVENT',
  MANUAL = 'MANUAL',
  FUTURE_SESSION = 'FUTURE_SESSION',
}

export enum MeetinoMeetingStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN',
}

export enum MeetinoParticipantType {
  REGISTERED = 'REGISTERED',
  GUEST = 'GUEST',
}

// ── Phase 12.1: Taxonomy enums ───────────────────────────────

export enum TaxonomyTermType {
  COURSE_CATEGORY = 'COURSE_CATEGORY',
  SKILL_CATEGORY = 'SKILL_CATEGORY',
  CREDIT_CATEGORY = 'CREDIT_CATEGORY',
  EVENT_CATEGORY = 'EVENT_CATEGORY',
  RESUME_CATEGORY = 'RESUME_CATEGORY',
  GENERAL = 'GENERAL',
}

export enum TaxonomyTermStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// ── Phase 12: Skills & Credits enums ────────────────────────

export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PROFESSIONAL = 'PROFESSIONAL',
}

export enum SkillStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum CreditType {
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  TEST_PASSED = 'TEST_PASSED',
  MENTOR_APPROVAL = 'MENTOR_APPROVAL',
  EVENT_ATTENDANCE = 'EVENT_ATTENDANCE',
  INTERVIEW_READY = 'INTERVIEW_READY',
  ACCESS_PERMISSION = 'ACCESS_PERMISSION',
  MANUAL = 'MANUAL',
  OTHER = 'OTHER',
}

export enum CreditStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum StudentSkillLevel {
  LEARNING = 'LEARNING',
  BASIC = 'BASIC',
  CONFIDENT = 'CONFIDENT',
  ADVANCED = 'ADVANCED',
  MASTERED = 'MASTERED',
}

export enum StudentCreditStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

// ── Phase 11.1: OTP enums ────────────────────────────────────

export enum OtpPurpose {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  ACTIVATE_ACCOUNT = 'ACTIVATE_ACCOUNT',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

// ── Phase 13: Certificate enums ──────────────────────────────

export enum CertificateTemplateType {
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  EVENT_ATTENDANCE = 'EVENT_ATTENDANCE',
  SKILL_CREDIT = 'SKILL_CREDIT',
  MANUAL = 'MANUAL',
  WORKSHOP = 'WORKSHOP',
  OTHER = 'OTHER',
}

export enum CertificateLanguage {
  FA = 'FA',
  EN = 'EN',
  FA_EN = 'FA_EN',
}

export enum StudentCertificateStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum StudentCertificateSourceType {
  COURSE = 'COURSE',
  COURSE_GROUP = 'COURSE_GROUP',
  ENROLLMENT = 'ENROLLMENT',
  CREDIT = 'CREDIT',
  EVENT = 'EVENT',
  MANUAL = 'MANUAL',
}

// ── Phase 14: Career Studio Enums ────────────────────────────

export enum CareerProfileVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC_LINK = 'PUBLIC_LINK',
  DISABLED = 'DISABLED',
}

export enum ResumeLanguage {
  FA = 'FA',
  EN = 'EN',
  FA_EN = 'FA_EN',
}

export enum ResumeVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC_LINK = 'PUBLIC_LINK',
  DISABLED = 'DISABLED',
}

export enum ResumeSectionType {
  SUMMARY = 'SUMMARY',
  EXPERIENCE = 'EXPERIENCE',
  EDUCATION = 'EDUCATION',
  PROJECT = 'PROJECT',
  SKILL = 'SKILL',
  CERTIFICATE = 'CERTIFICATE',
  COURSE = 'COURSE',
  CREDIT = 'CREDIT',
  EVENT = 'EVENT',
  LANGUAGE = 'LANGUAGE',
  LINK = 'LINK',
  CUSTOM = 'CUSTOM',
  TEXT_BLOCK = 'TEXT_BLOCK',
}

export enum ResumeTemplateType {
  ATS_FRIENDLY = 'ATS_FRIENDLY',
  MODERN = 'MODERN',
  MINIMAL = 'MINIMAL',
  CREATIVE = 'CREATIVE',
  ACADEMIC = 'ACADEMIC',
  TECHNICAL = 'TECHNICAL',
}

export enum ResumeExportFormat {
  PDF = 'PDF',
  HTML = 'HTML',
}

export enum ResumeExportStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  FAILED = 'FAILED',
}

export enum ResumeCheckSourceType {
  IRNO_RESUME = 'IRNO_RESUME',
  UPLOADED_FILE = 'UPLOADED_FILE',
  TEXT = 'TEXT',
  PASTED_TEXT = 'PASTED_TEXT',
}

export enum RoadmapNodeType {
  TOPIC = 'TOPIC',
  SKILL = 'SKILL',
  MILESTONE = 'MILESTONE',
  RESOURCE = 'RESOURCE',
}

export enum RoadmapStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum PortfolioProjectVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC_LINK = 'PUBLIC_LINK',
  PUBLIC = 'PUBLIC',
}
