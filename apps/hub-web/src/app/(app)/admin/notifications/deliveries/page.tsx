import type { Metadata } from 'next'
import { getMe, getNotificationDeliveries } from '@/lib/api'
import { UserRole } from '@irno/types'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'لاگ ارسال اعلان' }

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]

export default async function NotificationDeliveriesPage() {
  const user = await getMe()

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.notifications.accessDenied}</p>
      </div>
    )
  }

  const deliveries = await getNotificationDeliveries({ limit: 50 })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.notifications.deliveryLogs}
        </h1>
      </div>

      {deliveries.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-16 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.notifications.noDeliveries}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">کانال</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">وضعیت</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.notifications.provider}</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {deliveries.data.map((d) => (
                <tr key={d.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {fa.notificationChannel[d.channel]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        d.status === 'SENT'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : d.status === 'FAILED'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {fa.notificationStatus[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">
                    {d.provider ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(d.createdAt).toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        {deliveries.total} لاگ
      </p>
    </div>
  )
}
