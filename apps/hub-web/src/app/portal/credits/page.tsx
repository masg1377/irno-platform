'use client'

import { useState, useEffect } from 'react'
import { fa } from '@irno/i18n'
import type { PortalCreditDto } from '@irno/types'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    REVOKED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {fa.studentCreditStatus[status as keyof typeof fa.studentCreditStatus] ?? status}
    </span>
  )
}

function CreditTypeIcon({ type }: { type: string }) {
  // Simple text icon based on type
  const iconMap: Record<string, string> = {
    COURSE_COMPLETION: '🎓',
    TEST_PASSED: '✅',
    MENTOR_APPROVAL: '👨‍🏫',
    EVENT_ATTENDANCE: '🗓️',
    INTERVIEW_READY: '💼',
    ACCESS_PERMISSION: '🔑',
    MANUAL: '📝',
    OTHER: '⭐',
  }
  return <span className="text-xl">{iconMap[type] ?? '⭐'}</span>
}

export default function PortalCreditsPage() {
  const [credits, setCredits] = useState<PortalCreditDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch('/api/v1/portal/credits', { credentials: 'include' })
        const raw = (await res.json()) as { data?: PortalCreditDto[] | { data?: PortalCreditDto[] } }
        if (!res.ok) { setError('خطا در دریافت اعتبارها'); setLoading(false); return }
        const payload = raw.data
        const list = Array.isArray(payload)
          ? payload
          : (payload as { data?: PortalCreditDto[] })?.data ?? []
        setCredits(list)
      } catch {
        setError('خطا در اتصال به سرور')
      } finally {
        setLoading(false)
      }
    }
    void fetchCredits()
  }, [])

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.credits.myCredits}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        اعتبارهایی که توسط آکادمی ایرنو به شما اعطا شده است.
      </p>

      {loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && credits.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" className="text-[var(--color-text-muted)]">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="7" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8h4M12 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            هنوز هیچ اعتباری به شما اعطا نشده است.
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            اعتبارها پس از تکمیل دوره‌ها، قبولی در آزمون‌ها یا تأیید منتور صادر می‌شوند.
          </p>
        </div>
      )}

      {!loading && !error && credits.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {credits.map((credit) => (
            <div
              key={credit.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 transition-shadow hover:shadow-sm"
            >
              {/* Card header */}
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)]">
                  <CreditTypeIcon type={credit.creditType} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[var(--color-text-primary)] leading-snug">{credit.title}</h2>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {fa.creditType[credit.creditType as keyof typeof fa.creditType] ?? credit.creditType}
                  </p>
                </div>
                <StatusBadge status={credit.status} />
              </div>

              {/* Dates */}
              <div className="space-y-1 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center justify-between">
                  <span>{fa.credits.awardedAt}:</span>
                  <span>
                    {new Date(credit.awardedAt).toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {credit.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span>{fa.credits.expiresAt}:</span>
                    <span className={new Date(credit.expiresAt) < new Date() ? 'text-red-500' : ''}>
                      {new Date(credit.expiresAt).toLocaleDateString('fa-IR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
