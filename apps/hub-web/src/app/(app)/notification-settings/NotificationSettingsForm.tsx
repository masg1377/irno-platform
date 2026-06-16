'use client'

import { useState } from 'react'
import type { NotificationPreferenceDto } from '@irno/types'
import { fa } from '@irno/i18n'

interface Props {
  initialPrefs: NotificationPreferenceDto
}

export function NotificationSettingsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(key: keyof Omit<NotificationPreferenceDto, 'userId'>) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/notification-preferences/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inAppEnabled: prefs.inAppEnabled,
          smsTransactionalEnabled: prefs.smsTransactionalEnabled,
          smsMarketingEnabled: prefs.smsMarketingEnabled,
          emailEnabled: prefs.emailEnabled,
          telegramEnabled: prefs.telegramEnabled,
        }),
      })
      if (res.ok) {
        const json = (await res.json()) as { data: NotificationPreferenceDto }
        setPrefs(json.data)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  const settings: {
    key: keyof Omit<NotificationPreferenceDto, 'userId'>
    label: string
    hint?: string
  }[] = [
    { key: 'inAppEnabled', label: fa.notifications.inApp },
    { key: 'smsTransactionalEnabled', label: fa.notifications.smsTransactional, hint: fa.notifications.smsTransactionalHint },
    { key: 'smsMarketingEnabled', label: fa.notifications.smsMarketing, hint: fa.notifications.smsMarketingHint },
  ]

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <div className="divide-y divide-[var(--color-border)]">
        {settings.map(({ key, label, hint }) => (
          <div key={key} className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
              {hint && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key] as boolean}
              onClick={() => toggle(key)}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                (prefs[key] as boolean)
                  ? 'bg-[var(--color-brand-600)]'
                  : 'bg-[var(--color-bg-subtle)] border border-[var(--color-border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  (prefs[key] as boolean) ? 'translate-x-[-1.25rem]' : 'translate-x-[-0.125rem]'
                }`}
                style={{ right: 0 }}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)]">
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            تنظیمات ذخیره شد.
          </span>
        )}
        <div className="mr-auto">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-50 transition-colors"
          >
            {saving ? fa.ui.loading : fa.ui.save}
          </button>
        </div>
      </div>
    </div>
  )
}
