'use client'

import { useState } from 'react'
import { NotificationType, NotificationChannel, UserRole } from '@irno/types'
import { fa } from '@irno/i18n'

export default function AdminSendNotificationPage() {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: NotificationType.SYSTEM,
    channels: [NotificationChannel.IN_APP],
    roles: [] as UserRole[],
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState('')

  function update(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }))
    setResult(null)
    setError('')
  }

  function toggleRole(role: UserRole) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.roles.length === 0) {
      setError('حداقل یک نقش را انتخاب کنید.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/v1/admin/notifications/send', {
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
      const json = (await res.json()) as { data: { sent: number } }
      setResult(json.data)
    } finally {
      setSending(false)
    }
  }

  const staffRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.TEACHER, UserRole.MENTOR, UserRole.STUDENT]

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.notifications.manualSend}
      </h1>

      <p className="mb-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
        {fa.notifications.mockSmsNote}
      </p>

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">عنوان</label>
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">متن</label>
          <textarea
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">نوع</label>
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
          <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.notifications.sendToRoles}
          </label>
          <div className="flex flex-wrap gap-2">
            {staffRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.roles.includes(role)
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]'
                }`}
              >
                {fa.roles[role]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}

        {result && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
            {result.sent} اعلان ارسال شد.
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-[var(--color-brand-600)] py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-50 transition-colors"
        >
          {sending ? fa.ui.loading : 'ارسال اعلان'}
        </button>
      </form>
    </div>
  )
}
