import type { Metadata } from 'next'
import { getMe, getMyNotifications } from '@/lib/api'
import { fa } from '@irno/i18n'
import { NotificationCenter } from './NotificationCenter'

export const metadata: Metadata = { title: 'اعلان‌ها' }

export default async function NotificationsPage() {
  const [user, notifications] = await Promise.all([
    getMe(),
    getMyNotifications({ limit: 30 }),
  ])

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {fa.notifications.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {fa.notifications.subtitle}
          </p>
        </div>
      </div>

      <NotificationCenter initialData={notifications} />
    </div>
  )
}
