'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { NotificationDto } from '@irno/types'
import { fa } from '@irno/i18n'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications/unread-count', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const json = (await res.json()) as { data: { count: number } }
        setUnreadCount(json.data?.count ?? 0)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    void fetchCount()
    const interval = setInterval(() => void fetchCount(), 60_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  const fetchDropdown = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/notifications?limit=5', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const json = (await res.json()) as { data: { data: NotificationDto[] } }
        setNotifications(json.data?.data ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) void fetchDropdown()
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      })
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
    } catch {
      // silent
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
        aria-label={fa.notifications.title}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-11 z-50 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl"
          style={{ direction: 'rtl' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {fa.notifications.title}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-[var(--color-brand-600)] hover:underline"
              >
                {fa.notifications.markAllRead}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                {fa.ui.loading}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                {fa.notifications.empty}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-[var(--color-border)] px-4 py-3 last:border-0 ${
                    !n.readAt ? 'bg-[var(--color-brand-50)]/30 dark:bg-[var(--color-brand-900)]/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)] line-clamp-2">
                        {n.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border)] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-[var(--color-brand-600)] hover:underline"
            >
              {fa.notifications.viewAll}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5A1 1 0 0 0 3.4 15h13.2a1 1 0 0 0 .9-1.5L16 11V8a6 6 0 0 0-6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 15a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
