'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationType, NotificationChannel } from '@irno/types'
import { fa } from '@irno/i18n'

export default function NewNotificationTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    key: '',
    title: '',
    body: '',
    type: NotificationType.TRANSACTIONAL,
    channel: NotificationChannel.IN_APP,
    isActive: true,
  })

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/v1/admin/notification-templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = (await res.json()) as { message?: string }
        setError(json.message ?? fa.errors.generic)
        return
      }
      router.push('/admin/notification-templates')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.notifications.newTemplate}
      </h1>

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.notifications.templateKey}
          </label>
          <input
            value={form.key}
            onChange={(e) => update('key', e.target.value)}
            required
            placeholder="PAYMENT_REMINDER"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm font-mono text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.notifications.templateTitle}
          </label>
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.notifications.templateBody}
          </label>
          <textarea
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              نوع
            </label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
            >
              {Object.values(NotificationType).map((t) => (
                <option key={t} value={t}>{fa.notificationType[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              کانال
            </label>
            <select
              value={form.channel}
              onChange={(e) => update('channel', e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
            >
              {Object.values(NotificationChannel).map((c) => (
                <option key={c} value={c}>{fa.notificationChannel[c]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-50 transition-colors"
          >
            {saving ? fa.ui.loading : fa.ui.save}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {fa.ui.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
