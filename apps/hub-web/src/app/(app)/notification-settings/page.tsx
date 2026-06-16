import type { Metadata } from 'next'
import { getMe, getMyPreferences } from '@/lib/api'
import { fa } from '@irno/i18n'
import { NotificationSettingsForm } from './NotificationSettingsForm'

export const metadata: Metadata = { title: 'تنظیمات اعلان‌ها' }

export default async function NotificationSettingsPage() {
  const [user, prefs] = await Promise.all([getMe(), getMyPreferences()])

  if (!user) return null

  const initialPrefs = prefs ?? {
    userId: user.id,
    inAppEnabled: true,
    smsTransactionalEnabled: true,
    smsMarketingEnabled: false,
    emailEnabled: false,
    telegramEnabled: false,
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.notifications.settings}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {fa.notifications.mockSmsNote}
        </p>
      </div>

      <NotificationSettingsForm initialPrefs={initialPrefs} />
    </div>
  )
}
