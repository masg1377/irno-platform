import type { Metadata } from 'next'
import { getPortalEnrollments } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'دوره‌های من' }

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  ACTIVE: 'فعال',
  PAUSED: 'متوقف',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  ACTIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PAUSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  COMPLETED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CANCELLED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default async function PortalEnrollmentsPage() {
  const enrollments = await getPortalEnrollments()

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.myCourses}
      </h1>

      {enrollments.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">{fa.portal.noEnrollments}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[var(--color-text-primary)]">
                    {e.course.title}
                  </h2>
                  {e.courseGroup && (
                    <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                      {e.courseGroup.name}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {fa.portal.enrollmentDate}:{' '}
                    {new Date(e.enrollmentDate).toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[e.status] ?? ''}`}>
                    {STATUS_LABELS[e.status] ?? e.status}
                  </span>
                  {e.meetinoJoinUrl && (
                    <a
                      href={e.meetinoJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-700)]"
                    >
                      {fa.portal.joinClass}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
