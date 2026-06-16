import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStudent, getEnrollments, getPayments, getMe } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'
import { StudentStatusBadge } from '../page'
import { StudentActions, StudentTimelineAddNote } from './student-actions'
import { StudentSkillsTab, StudentCreditsTab } from './student-skills-tab'
import { StudentCertificatesTab } from './student-certificates-tab'

const FINANCE_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const student = await getStudent(id)
  return { title: student?.fullName ?? 'دانشجو' }
}

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab ?? 'info'

  const [student, currentUser] = await Promise.all([getStudent(id), getMe()])
  if (!student) notFound()

  const canSeeFinance = currentUser ? FINANCE_ROLES.includes(currentUser.role) : false

  const [enrollmentsData, paymentsData] = await Promise.all([
    activeTab === 'courses' ? getEnrollments({ studentId: id }) : Promise.resolve(null),
    activeTab === 'payments' && canSeeFinance ? getPayments({ studentId: id }) : Promise.resolve(null),
  ])

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/students" className="hover:text-[var(--color-text-primary)]">
          {fa.students.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{student.fullName}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-xl font-bold text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]">
          {student.firstName?.[0] ?? '؟'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {student.fullName}
            </h1>
            <StudentStatusBadge status={student.status} />
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
            <span className="font-mono" dir="ltr">
              {student.studentCode}
            </span>
            <span>·</span>
            <span className="font-mono" dir="ltr">
              {student.mobile}
            </span>
            {student.city && (
              <>
                <span>·</span>
                <span>{student.city}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {[
          { key: 'info', label: fa.students.info },
          { key: 'timeline', label: fa.students.timeline },
          { key: 'courses', label: fa.students.courses },
          { key: 'payments', label: fa.students.payments },
          { key: 'skills', label: fa.skills.title },
          { key: 'credits', label: fa.credits.title },
          { key: 'certificates', label: fa.certificates.title },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/students/${id}?tab=${t.key}`}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'border-b-2 border-[var(--color-brand-600)] text-[var(--color-brand-600)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                اطلاعات دانشجو
              </h2>
              <InfoRow label={fa.students.email} value={student.email ?? '—'} dir="ltr" />
              <InfoRow label={fa.students.city} value={student.city ?? '—'} />
              <InfoRow label={fa.students.studentCode} value={student.studentCode} dir="ltr" />
              {student.originApplicantId && (
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {fa.students.originApplicant}
                  </span>
                  <Link
                    href={`/applicants/${student.originApplicantId}`}
                    className="text-sm text-[var(--color-brand-600)] hover:underline"
                  >
                    مشاهده متقاضی اصلی
                  </Link>
                </div>
              )}
            </div>

            {(student.interestedCourseName || student.interestedTopic) && (
              <div className="rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-5 dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-900)]/20">
                <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
                  {fa.students.interestedIn}
                </h2>
                {student.interestedCourseName && (
                  <InfoRow label={fa.students.interestedCourse} value={student.interestedCourseName} />
                )}
                {student.interestedTopic && (
                  <InfoRow label={fa.students.interestedTopic} value={student.interestedTopic} />
                )}
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  {fa.students.enrollmentPlaceholder}
                </p>
              </div>
            )}

            {student.internalNotes && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
                  {fa.students.internalNotes}
                </h2>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                  {student.internalNotes}
                </p>
              </div>
            )}
          </div>

          <div>
            <StudentActions studentId={student.id} currentStatus={student.status} />
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <StudentTimeline studentId={student.id} initialEvents={student.timeline ?? []} />
      )}

      {activeTab === 'courses' && (
        <div className="space-y-3">
          {!enrollmentsData || enrollmentsData.data.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">هنوز هیچ ثبت‌نامی ثبت نشده است.</p>
              <Link
                href={`/enrollments/new?studentId=${student.id}`}
                className="mt-4 inline-block text-sm text-[var(--color-brand-600)] hover:underline"
              >
                ثبت‌نام جدید
              </Link>
            </div>
          ) : (
            <>
              {enrollmentsData.data.map((e) => (
                <Link
                  key={e.id}
                  href={`/enrollments/${e.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:border-[var(--color-brand-300)] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{e.courseName}</p>
                    {e.courseGroupName && (
                      <p className="text-xs text-[var(--color-text-muted)]">{e.courseGroupName}</p>
                    )}
                  </div>
                  <div className="text-left shrink-0 text-xs text-[var(--color-text-muted)]">
                    {fa.enrollmentStatus[e.status]}
                  </div>
                </Link>
              ))}
              <Link
                href={`/enrollments/new?studentId=${student.id}`}
                className="block text-center text-sm text-[var(--color-brand-600)] hover:underline pt-1"
              >
                + ثبت‌نام جدید
              </Link>
            </>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        canSeeFinance ? (
          <div className="space-y-3">
            {!paymentsData || paymentsData.data.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">هنوز هیچ رکورد مالی ثبت نشده است.</p>
              </div>
            ) : (
              paymentsData.data.map((p) => (
                <Link
                  key={p.id}
                  href={`/payments/${p.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:border-[var(--color-brand-300)] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{p.courseName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      پرداخت‌شده: {p.paidAmountToman.toLocaleString('fa-IR')} تومان
                      {' · '}مانده: {p.remainingAmountToman.toLocaleString('fa-IR')} تومان
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--color-text-muted)]">
                    {fa.paymentStatus[p.status]}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">دسترسی به اطلاعات مالی ندارید.</p>
          </div>
        )
      )}

      {activeTab === 'skills' && (
        <StudentSkillsTab studentId={student.id} />
      )}

      {activeTab === 'credits' && (
        <StudentCreditsTab studentId={student.id} />
      )}

      {activeTab === 'certificates' && (
        <StudentCertificatesTab studentId={student.id} />
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)]" dir={dir}>
        {value}
      </span>
    </div>
  )
}

function getTimelineEventColor(eventType: string): string {
  if (eventType.startsWith('PAYMENT') || eventType.startsWith('INSTALLMENT')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  }
  if (eventType.startsWith('ENROLLMENT')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }
  if (eventType === 'STUDENT_NOTE_ADDED') {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
  }
  if (eventType.startsWith('APPLICANT')) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
  }
  return 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]'
}

function getTimelineEventIcon(eventType: string): string {
  if (eventType.startsWith('PAYMENT')) return '💰'
  if (eventType.startsWith('INSTALLMENT')) return '📅'
  if (eventType.startsWith('ENROLLMENT')) return '📋'
  if (eventType === 'STUDENT_NOTE_ADDED') return '✏️'
  if (eventType === 'STUDENT_CREATED') return '🎓'
  if (eventType === 'STUDENT_STATUS_CHANGED') return '🔄'
  if (eventType.startsWith('APPLICANT')) return '👤'
  return '⚡'
}

function TimelineEventMeta({
  eventType,
  metadata,
}: {
  eventType: string
  metadata: Record<string, unknown> | null
}) {
  if (!metadata) return null

  if (eventType === 'PAYMENT_RECORDED' && metadata['amountToman']) {
    return (
      <span className="mt-1 inline-block rounded bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
        مبلغ: {Number(metadata['amountToman']).toLocaleString('fa-IR')} تومان
      </span>
    )
  }
  if (eventType === 'ENROLLMENT_CREATED' && metadata['courseName']) {
    return (
      <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        دوره: {String(metadata['courseName'])}
      </span>
    )
  }
  if (eventType === 'INSTALLMENT_CREATED' && metadata['count']) {
    return (
      <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        تعداد اقساط: {Number(metadata['count']).toLocaleString('fa-IR')}
      </span>
    )
  }
  return null
}

function StudentTimeline({
  studentId,
  initialEvents,
}: {
  studentId: string
  initialEvents: Array<{
    id: string
    eventType: string
    title: string
    actorName: string | null
    isManual: boolean
    metadata?: Record<string, unknown> | null
    createdAt: string
  }>
}) {
  if (initialEvents.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.students.noTimeline}</p>
        </div>
        <StudentTimelineAddNote studentId={studentId} />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Add note at top */}
      <div className="mb-4">
        <StudentTimelineAddNote studentId={studentId} />
      </div>

      {/* Timeline vertical line */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute right-[22px] top-0 bottom-0 w-px bg-[var(--color-border)]" aria-hidden="true" />

        <div className="space-y-1">
          {initialEvents.map((event) => {
            const colorClass = getTimelineEventColor(event.eventType)
            const icon = getTimelineEventIcon(event.eventType)
            return (
              <div key={event.id} className="relative flex gap-4 py-2">
                {/* Dot on the vertical line */}
                <div
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base ${colorClass}`}
                >
                  <span>{icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{event.title}</p>
                  <TimelineEventMeta
                    eventType={event.eventType}
                    metadata={(event.metadata as Record<string, unknown>) ?? null}
                  />
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    {event.isManual && (
                      <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                        دستی
                      </span>
                    )}
                    <span>{event.actorName ?? '—'}</span>
                    <span>·</span>
                    <span>{new Date(event.createdAt).toLocaleDateString('fa-IR')}</span>
                    <span>{new Date(event.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
