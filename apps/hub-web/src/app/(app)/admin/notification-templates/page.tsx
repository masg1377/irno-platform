import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getNotificationTemplates } from '@/lib/api'
import { UserRole } from '@irno/types'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'قالب‌های اعلان' }

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]

export default async function NotificationTemplatesPage() {
  const user = await getMe()

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.notifications.accessDenied}</p>
      </div>
    )
  }

  const templates = await getNotificationTemplates()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {fa.notifications.templates}
          </h1>
        </div>
        <Link
          href="/admin/notification-templates/new"
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
        >
          {fa.notifications.newTemplate}
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-16 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.notifications.noTemplates}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">کلید</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">عنوان</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">نوع</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">کانال</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">{t.key}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{t.title}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {fa.notificationType[t.type]}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {fa.notificationChannel[t.channel]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        t.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {t.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
