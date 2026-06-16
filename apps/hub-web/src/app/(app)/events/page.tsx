'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import {
  EventType, EventDeliveryMode, EventRegistrationMode, EventStatus,
} from '@irno/types'
import type { EventDto, PaginatedEvents } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

const EVENT_TYPE_OPTIONS = Object.values(EventType)
const DELIVERY_MODE_OPTIONS = Object.values(EventDeliveryMode)
const REGISTRATION_MODE_OPTIONS = Object.values(EventRegistrationMode)
const STATUS_OPTIONS = Object.values(EventStatus)

function StatusBadge({ status }: { status: EventStatus }) {
  const colors: Record<EventStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    PUBLISHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    REGISTRATION_OPEN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    LIVE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    COMPLETED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}>
      {fa.eventStatus[status]}
    </span>
  )
}

export default function EventsPage() {
  const [data, setData] = useState<PaginatedEvents>({ data: [], total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [deliveryMode, setDeliveryMode] = useState('')
  const [registrationMode, setRegistrationMode] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (search) qs.set('search', search)
      if (categoryId) qs.set('categoryId', categoryId)
      if (type) qs.set('type', type)
      if (deliveryMode) qs.set('deliveryMode', deliveryMode)
      if (registrationMode) qs.set('registrationMode', registrationMode)
      if (status) qs.set('status', status)
      qs.set('page', String(page))
      qs.set('limit', '20')
      const res = await fetch(`/api/v1/events?${qs.toString()}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json() as { data: PaginatedEvents }
        setData(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, type, deliveryMode, registrationMode, status, page])

  useEffect(() => { void load() }, [load])

  const totalPages = Math.ceil(data.total / data.limit)

  return (
    <div dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.events.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.events.subtitle}</p>
        </div>
        <Link
          href="/events/new"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--color-brand-600)' }}
        >
          {fa.events.newEvent}
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder={fa.events.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] min-w-[200px]"
        />
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">{fa.events.allTypes}</option>
          {EVENT_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{fa.eventType[t]}</option>
          ))}
        </select>
        <select
          value={deliveryMode}
          onChange={(e) => { setDeliveryMode(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">{fa.events.allDeliveryModes}</option>
          {DELIVERY_MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>{fa.eventDeliveryMode[m]}</option>
          ))}
        </select>
        <select
          value={registrationMode}
          onChange={(e) => { setRegistrationMode(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">{fa.events.allRegistrationModes}</option>
          {REGISTRATION_MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>{fa.eventRegistrationMode[m]}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">{fa.events.allStatuses}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{fa.eventStatus[s]}</option>
          ))}
        </select>
        <div className="w-52">
          <TaxonomySelect
            type="EVENT_CATEGORY"
            value={categoryId}
            onChange={(id) => { setCategoryId(id); setPage(1) }}
            placeholder="دسته‌بندی رویداد..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
            {fa.ui.loading}
          </div>
        ) : data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
            <div className="mb-2 text-3xl">📅</div>
            <div>{fa.events.noEvents}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.title_}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.type}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.deliveryMode}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.registrationMode}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.startsAt}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.capacity_}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.status}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.events.registrationCount}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.data.map((ev: EventDto) => (
                  <tr key={ev.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {ev.title}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{fa.eventType[ev.type]}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{fa.eventDeliveryMode[ev.deliveryMode]}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{fa.eventRegistrationMode[ev.registrationMode]}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] tabular-nums text-xs">
                      {new Date(ev.startsAt).toLocaleString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {ev.capacity ? ev.capacity.toLocaleString('fa-IR') : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {ev.registrationCount.toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/events/${ev.id}`}
                        className="text-xs font-medium text-[var(--color-brand-600)] hover:underline"
                      >
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>مجموع: {data.total.toLocaleString('fa-IR')} رویداد</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              قبلی
            </button>
            <span className="px-2 py-1.5">صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
