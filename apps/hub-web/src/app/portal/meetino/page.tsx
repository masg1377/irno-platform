import type { Metadata } from 'next'
import { getPortalMeetinoLinks } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'جلسات آنلاین' }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SCHEDULED: 'برنامه‌ریزی‌شده',
  LIVE: 'در حال برگزاری',
  ENDED: 'پایان‌یافته',
  CANCELLED: 'لغو شده',
  UNKNOWN: 'نامشخص',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  SCHEDULED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ENDED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  CANCELLED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  UNKNOWN: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
}

const SOURCE_LABELS: Record<string, string> = {
  COURSE_GROUP: 'گروه آموزشی',
  EVENT: 'رویداد',
  MANUAL: 'دستی',
  FUTURE_SESSION: 'جلسه آینده',
}

export default async function PortalMeetinoPage() {
  const links = await getPortalMeetinoLinks()

  return (
    <div dir="rtl" className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.portal.myMeetino}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          لینک‌های ورود به کلاس‌ها و جلسات آنلاین ایرنو
        </p>
      </div>

      {links.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">{fa.portal.noMeetinoLinks}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[var(--color-text-primary)]">{link.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span className="rounded-md bg-[var(--color-bg-subtle)] px-2 py-0.5">
                      {SOURCE_LABELS[link.sourceType] ?? link.sourceType}
                    </span>
                    <span>{link.sourceLabel}</span>
                  </div>
                  {link.startsAt && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      {fa.portal.scheduledAt}:{' '}
                      {new Date(link.startsAt).toLocaleDateString('fa-IR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[link.status] ?? ''}`}>
                    {STATUS_LABELS[link.status] ?? link.status}
                  </span>
                  <a
                    href={link.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-700)]"
                  >
                    {fa.portal.joinSession}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 text-xs text-[var(--color-text-muted)]">
        لینک‌های کلاس پس از ثبت‌نام در دوره یا تأیید ثبت‌نام در رویداد نمایش داده می‌شوند.
      </div>
    </div>
  )
}
