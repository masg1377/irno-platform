import type { Metadata } from 'next'
import { getMyNotifications } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'اعلان‌های من' }

const TYPE_LABELS: Record<string, string> = {
  TRANSACTIONAL: 'تراکنشی',
  MARKETING: 'بازاریابی',
  REMINDER: 'یادآوری',
  SYSTEM: 'سیستمی',
}

export default async function PortalNotificationsPage() {
  const notifications = await getMyNotifications({ limit: 50 })

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.myNotifications}
      </h1>

      {notifications.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">اعلانی برای نمایش وجود ندارد.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden divide-y divide-[var(--color-border)]">
          {notifications.data.map((n) => (
            <div
              key={n.id}
              className={`p-4 ${!n.readAt ? 'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/10' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.readAt && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-600)]" />
                    )}
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {n.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{n.body}</p>
                </div>
                <div className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {new Date(n.createdAt).toLocaleDateString('fa-IR')}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <a
          href="/portal/notifications"
          className="text-sm text-[var(--color-brand-600)] hover:underline"
        >
          <NotificationMarkAllButton />
        </a>
      </div>
    </div>
  )
}

function NotificationMarkAllButton() {
  // Client-side mark-all — rendered as text for now; can be wired as a client component if needed
  return null
}
