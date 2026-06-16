'use client'

import { useState } from 'react'
import type { NotificationDto, PaginatedNotifications } from '@irno/types'
import { NotificationType } from '@irno/types'
import { fa } from '@irno/i18n'

interface Props {
  initialData: PaginatedNotifications
}

const FILTERS: { label: string; value: string | null }[] = [
  { label: 'همه', value: null },
  { label: fa.notifications.unread, value: 'unread' },
  { label: fa.notificationType.SYSTEM, value: NotificationType.SYSTEM },
  { label: fa.notificationType.REMINDER, value: NotificationType.REMINDER },
  { label: fa.notificationType.MARKETING, value: NotificationType.MARKETING },
]

export function NotificationCenter({ initialData }: Props) {
  const [data, setData] = useState<PaginatedNotifications>(initialData)
  const [filter, setFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function applyFilter(value: string | null) {
    setFilter(value)
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '30')
      if (value === 'unread') qs.set('unreadOnly', 'true')
      else if (value) qs.set('type', value)

      const res = await fetch(`/api/v1/notifications?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const json = (await res.json()) as { data: PaginatedNotifications }
        setData(json.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function markAll() {
    try {
      await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      })
      setData((prev) => ({
        ...prev,
        data: prev.data.map((n) => ({ ...n, readAt: new Date().toISOString() })),
      }))
    } catch {
      // silent
    }
  }

  async function markOne(id: string) {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      })
      setData((prev) => ({
        ...prev,
        data: prev.data.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      }))
    } catch {
      // silent
    }
  }

  const notifications = data.data

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value ?? 'all'}
            type="button"
            onClick={() => void applyFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-[var(--color-brand-600)] text-white'
                : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            {f.label}
          </button>
        ))}

        {notifications.some((n) => !n.readAt) && (
          <button
            type="button"
            onClick={() => void markAll()}
            className="mr-auto rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {fa.notifications.markAllRead}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">{fa.ui.loading}</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-16 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.notifications.empty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={markOne} />
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
        {data.total} اعلان
      </p>
    </div>
  )
}

function NotificationCard({
  notification: n,
  onMarkRead,
}: {
  notification: NotificationDto
  onMarkRead: (id: string) => void
}) {
  const isUnread = !n.readAt

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition-colors ${
        isUnread
          ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)]/40 dark:border-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/10'
          : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {isUnread && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{n.title}</p>
            <span className="rounded-md bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
              {fa.notificationType[n.type]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{n.body}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {new Date(n.createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {isUnread && (
          <button
            type="button"
            onClick={() => onMarkRead(n.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] transition-colors"
          >
            {fa.notifications.markAsRead}
          </button>
        )}
      </div>
    </div>
  )
}
