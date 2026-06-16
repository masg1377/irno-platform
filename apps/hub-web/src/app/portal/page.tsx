import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getPortalMe,
  getPortalEnrollments,
  getPortalPayments,
  getPortalInstallments,
  getPortalEvents,
  getPortalMeetinoLinks,
  getMyNotifications,
} from '@/lib/api'
import { UserRole, InstallmentStatus, PaymentStatus, EnrollmentStatus } from '@irno/types'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'پورتال من' }

export default async function PortalHomePage() {
  const portalMe = await getPortalMe()
  if (!portalMe) return null

  const displayName = portalMe.profile
    ? `${portalMe.profile.firstName} ${portalMe.profile.lastName}`
    : portalMe.mobile

  const isStudent = portalMe.role === UserRole.STUDENT || !!portalMe.studentSummary
  const isApplicant = portalMe.role === UserRole.APPLICANT || !!portalMe.applicantSummary

  // Fetch data in parallel based on role
  const [enrollments, payments, installments, events, meetinoLinks, notifications] =
    await Promise.all([
      isStudent ? getPortalEnrollments() : Promise.resolve([]),
      isStudent ? getPortalPayments() : Promise.resolve([]),
      isStudent ? getPortalInstallments() : Promise.resolve([]),
      getPortalEvents(),
      isStudent ? getPortalMeetinoLinks() : Promise.resolve([]),
      getMyNotifications({ unreadOnly: true, limit: 5 }),
    ])

  const activeEnrollments = enrollments.filter(
    (e) => e.status === EnrollmentStatus.ACTIVE || e.status === EnrollmentStatus.PENDING,
  )
  const unpaidPayments = payments.filter(
    (p) => p.status === PaymentStatus.UNPAID || p.status === PaymentStatus.PARTIALLY_PAID || p.status === PaymentStatus.OVERDUE,
  )
  const overdueInstallments = installments.filter(
    (i) => i.status === InstallmentStatus.OVERDUE,
  )
  const upcomingInstallments = installments
    .filter((i) => i.status === InstallmentStatus.PENDING)
    .slice(0, 3)

  const unreadCount = notifications.total

  return (
    <div dir="rtl" className="max-w-4xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.portal.welcome}، {displayName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {fa.portal.subtitle}
        </p>
      </div>

      {/* Applicant view */}
      {isApplicant && portalMe.applicantSummary && (
        <div className="mb-6 rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-5 dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-900)]/20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl">📋</span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[var(--color-brand-800)] dark:text-[var(--color-brand-200)]">
                {fa.portal.applicantWelcomeTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]">
                {portalMe.applicantSummary.nextSteps}
              </p>
              {portalMe.applicantSummary.interestedCourseName && (
                <p className="mt-2 text-sm text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">
                  {fa.portal.interestedCourse}: {portalMe.applicantSummary.interestedCourseName}
                </p>
              )}
              <Link
                href="/portal/applicant-status"
                className="mt-3 inline-block text-sm font-medium text-[var(--color-brand-700)] underline decoration-dotted hover:decoration-solid dark:text-[var(--color-brand-300)]"
              >
                مشاهده وضعیت درخواست →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {overdueInstallments.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {overdueInstallments.length} قسط سررسیدگذشته دارید.{' '}
              <Link href="/portal/installments" className="underline">
                مشاهده اقساط
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Student KPI cards */}
      {isStudent && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            href="/portal/enrollments"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-2">{fa.portal.activeEnrollments}</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {activeEnrollments.length.toLocaleString('fa-IR')}
            </div>
          </Link>
          <Link
            href="/portal/payments"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-2">پرداخت‌های باز</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {unpaidPayments.length.toLocaleString('fa-IR')}
            </div>
          </Link>
          <Link
            href="/portal/installments"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-2">اقساط معوق</div>
            <div className={`text-2xl font-bold ${overdueInstallments.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-primary)]'}`}>
              {overdueInstallments.length.toLocaleString('fa-IR')}
            </div>
          </Link>
          <Link
            href="/portal/notifications"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-2">اعلان‌های خوانده‌نشده</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {unreadCount.toLocaleString('fa-IR')}
            </div>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active enrollments */}
        {isStudent && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--color-text-primary)]">{fa.portal.myCourses}</h2>
              <Link href="/portal/enrollments" className="text-xs text-[var(--color-brand-600)] hover:underline">
                همه →
              </Link>
            </div>
            {activeEnrollments.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{fa.portal.noEnrollments}</p>
            ) : (
              <ul className="space-y-3">
                {activeEnrollments.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {e.course.title}
                      </div>
                      {e.courseGroup && (
                        <div className="text-xs text-[var(--color-text-muted)]">{e.courseGroup.name}</div>
                      )}
                    </div>
                    {e.meetinoJoinUrl && (
                      <a
                        href={e.meetinoJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--color-brand-700)]"
                      >
                        ورود به کلاس
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Upcoming installments */}
        {isStudent && upcomingInstallments.length > 0 && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--color-text-primary)]">اقساط پیش رو</h2>
              <Link href="/portal/installments" className="text-xs text-[var(--color-brand-600)] hover:underline">
                همه →
              </Link>
            </div>
            <ul className="space-y-3">
              {upcomingInstallments.map((i) => (
                <li key={i.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                      {i.amountToman.toLocaleString('fa-IR')} تومان
                    </div>
                    {i.courseName && (
                      <div className="text-xs text-[var(--color-text-muted)]">{i.courseName}</div>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {new Date(i.dueDate).toLocaleDateString('fa-IR')}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Meetino links */}
        {isStudent && meetinoLinks.length > 0 && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--color-text-primary)]">{fa.portal.myMeetino}</h2>
              <Link href="/portal/meetino" className="text-xs text-[var(--color-brand-600)] hover:underline">
                همه →
              </Link>
            </div>
            <ul className="space-y-3">
              {meetinoLinks.slice(0, 3).map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {link.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">{link.sourceLabel}</div>
                  </div>
                  <a
                    href={link.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--color-brand-700)]"
                  >
                    ورود
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Events */}
        {events.length > 0 && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--color-text-primary)]">{fa.portal.myEvents}</h2>
              <Link href="/portal/events" className="text-xs text-[var(--color-brand-600)] hover:underline">
                همه →
              </Link>
            </div>
            <ul className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {event.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {new Date(event.startAt).toLocaleDateString('fa-IR')}
                    </div>
                  </div>
                  {event.meetinoJoinUrl && event.registrationStatus === 'APPROVED' && (
                    <a
                      href={event.meetinoJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--color-brand-700)]"
                    >
                      ورود
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quick links */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">دسترسی سریع</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/portal/profile" className="rounded-lg border border-[var(--color-border)] p-3 text-center text-sm hover:bg-[var(--color-bg-subtle)] transition-colors">
              <div className="text-lg mb-1">👤</div>
              <div className="text-xs text-[var(--color-text-secondary)]">پروفایل</div>
            </Link>
            <Link href="/portal/notifications" className="rounded-lg border border-[var(--color-border)] p-3 text-center text-sm hover:bg-[var(--color-bg-subtle)] transition-colors">
              <div className="text-lg mb-1">🔔</div>
              <div className="text-xs text-[var(--color-text-secondary)]">اعلان‌ها</div>
              {unreadCount > 0 && (
                <span className="inline-block mt-1 rounded-full bg-[var(--color-brand-600)] px-1.5 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            {isStudent && (
              <>
                <Link href="/portal/payments" className="rounded-lg border border-[var(--color-border)] p-3 text-center text-sm hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <div className="text-lg mb-1">💳</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">پرداخت‌ها</div>
                </Link>
                <Link href="/portal/events" className="rounded-lg border border-[var(--color-border)] p-3 text-center text-sm hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <div className="text-lg mb-1">📅</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">رویدادها</div>
                </Link>
              </>
            )}
            {isApplicant && (
              <Link href="/portal/applicant-status" className="rounded-lg border border-[var(--color-border)] p-3 text-center text-sm hover:bg-[var(--color-bg-subtle)] transition-colors">
                <div className="text-lg mb-1">📋</div>
                <div className="text-xs text-[var(--color-text-secondary)]">وضعیت درخواست</div>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
