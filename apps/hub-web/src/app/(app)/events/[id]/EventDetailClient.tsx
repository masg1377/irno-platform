'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'
import {
  EventStatus, EventDeliveryMode, EventRegistrationMode, EventRegistrationStatus,
  EventRegistrationPaymentStatus, EventEligibilityRuleType, NotificationChannel,
  PaymentMethod,
} from '@irno/types'
import type {
  EventDto, PaginatedEventRegistrations, EventEligibilityRuleDto,
  EventReminderDto, EventReportDto, EventRegistrationDto,
} from '@irno/types'

// ── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: EventStatus }) {
  const colors: Record<EventStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    PUBLISHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    REGISTRATION_OPEN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    LIVE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    COMPLETED: 'bg-gray-100 text-gray-500',
    CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}>
      {fa.eventStatus[status]}
    </span>
  )
}

function RegStatusBadge({ status }: { status: EventRegistrationStatus }) {
  const colors: Record<EventRegistrationStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    WAITLISTED: 'bg-blue-100 text-blue-700',
    REJECTED: 'bg-red-100 text-red-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
    ATTENDED: 'bg-emerald-100 text-emerald-700',
    NO_SHOW: 'bg-orange-100 text-orange-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {fa.eventRegistrationStatus[status]}
    </span>
  )
}

function PayStatusBadge({ status }: { status: EventRegistrationPaymentStatus }) {
  const colors: Record<EventRegistrationPaymentStatus, string> = {
    NOT_REQUIRED: 'bg-gray-100 text-gray-500',
    UNPAID: 'bg-red-100 text-red-600',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    REFUNDED: 'bg-purple-100 text-purple-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {fa.eventRegistrationPaymentStatus[status]}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────

interface Props {
  event: EventDto
  initialRegistrations: PaginatedEventRegistrations
  initialEligibilityRules: EventEligibilityRuleDto[]
  initialReminders: EventReminderDto[]
  initialReport: EventReportDto | null
}

type Tab = 'info' | 'registrations' | 'eligibility' | 'payments' | 'reminders' | 'report' | 'meetino'

const TABS: { key: Tab; label: string; onlineOnly?: boolean }[] = [
  { key: 'info', label: fa.events.tabInfo },
  { key: 'registrations', label: fa.events.tabRegistrations },
  { key: 'eligibility', label: fa.events.tabEligibility },
  { key: 'payments', label: fa.events.tabPayments },
  { key: 'reminders', label: fa.events.tabReminders },
  { key: 'report', label: fa.events.tabReport },
  { key: 'meetino', label: 'جلسه میتینو', onlineOnly: true },
]

export function EventDetailClient({ event, initialRegistrations, initialEligibilityRules, initialReminders, initialReport }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [eligibilityRules, setEligibilityRules] = useState(initialEligibilityRules)
  const [reminders, setReminders] = useState(initialReminders)
  const [report] = useState(initialReport)

  // ── Status update ──────────────────────────────────────────
  const [statusUpdating, setStatusUpdating] = useState(false)
  async function handleStatusChange(newStatus: EventStatus) {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/v1/events/${event.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) router.refresh()
    } finally {
      setStatusUpdating(false)
    }
  }

  // ── Delete event ───────────────────────────────────────────
  const [deleting, setDeleting] = useState(false)
  async function handleDelete() {
    if (!confirm('آیا از حذف/لغو این رویداد مطمئن هستید؟')) return
    setDeleting(true)
    try {
      await fetch(`/api/v1/events/${event.id}`, { method: 'DELETE', credentials: 'include' })
      router.push('/events')
    } finally {
      setDeleting(false)
    }
  }

  // ── Add registration modal ─────────────────────────────────
  const [showRegModal, setShowRegModal] = useState(false)
  const [regForm, setRegForm] = useState({ fullName: '', mobile: '', email: '', notes: '' })
  const [regSaving, setRegSaving] = useState(false)
  const [regError, setRegError] = useState('')

  async function handleCreateReg(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    setRegSaving(true)
    try {
      const res = await fetch(`/api/v1/events/${event.id}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(regForm),
      })
      const json = await res.json() as { data?: EventRegistrationDto; message?: string }
      if (!res.ok) { setRegError(json.message ?? fa.errors.generic); return }
      setRegistrations((prev) => ({
        ...prev,
        data: [json.data!, ...prev.data],
        total: prev.total + 1,
      }))
      setShowRegModal(false)
      setRegForm({ fullName: '', mobile: '', email: '', notes: '' })
    } catch {
      setRegError(fa.errors.networkError)
    } finally {
      setRegSaving(false)
    }
  }

  // ── Registration status update ─────────────────────────────
  async function handleRegStatus(registrationId: string, newStatus: EventRegistrationStatus) {
    const res = await fetch(`/api/v1/events/${event.id}/registrations/${registrationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const json = await res.json() as { data: EventRegistrationDto }
      setRegistrations((prev) => ({
        ...prev,
        data: prev.data.map((r) => (r.id === registrationId ? json.data : r)),
      }))
    }
  }

  // ── Check-in ───────────────────────────────────────────────
  async function handleCheckIn(registrationId: string) {
    const res = await fetch(`/api/v1/events/${event.id}/registrations/${registrationId}/check-in`, {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const json = await res.json() as { data: EventRegistrationDto }
      setRegistrations((prev) => ({
        ...prev,
        data: prev.data.map((r) => (r.id === registrationId ? json.data : r)),
      }))
    }
  }

  // ── Record payment modal ───────────────────────────────────
  const [payModal, setPayModal] = useState<string | null>(null) // registrationId
  const [payForm, setPayForm] = useState({ amountToman: '', method: 'CASH', paidAt: new Date().toISOString().slice(0, 16), receiptNote: '' })
  const [paySaving, setPaySaving] = useState(false)
  const [payError, setPayError] = useState('')

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payModal) return
    setPayError('')
    setPaySaving(true)
    try {
      const res = await fetch(`/api/v1/events/${event.id}/registrations/${payModal}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amountToman: parseInt(payForm.amountToman),
          method: payForm.method,
          paidAt: payForm.paidAt,
          receiptNote: payForm.receiptNote || undefined,
        }),
      })
      const json = await res.json() as { message?: string }
      if (!res.ok) { setPayError(json.message ?? fa.errors.generic); return }
      // Re-fetch registrations
      const rRes = await fetch(`/api/v1/events/${event.id}/registrations?limit=50`, { credentials: 'include' })
      if (rRes.ok) {
        const rJson = await rRes.json() as { data: PaginatedEventRegistrations }
        setRegistrations(rJson.data)
      }
      setPayModal(null)
    } catch {
      setPayError(fa.errors.networkError)
    } finally {
      setPaySaving(false)
    }
  }

  // ── Add eligibility rule ───────────────────────────────────
  const [ruleType, setRuleType] = useState<EventEligibilityRuleType>(EventEligibilityRuleType.PUBLIC)
  const [ruleValue, setRuleValue] = useState('')
  const [ruleSaving, setRuleSaving] = useState(false)

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault()
    setRuleSaving(true)
    try {
      let value: Record<string, string> | undefined
      if (ruleValue) {
        if (ruleType === EventEligibilityRuleType.SPECIFIC_COURSE || ruleType === EventEligibilityRuleType.COMPLETED_COURSE) {
          value = { courseId: ruleValue }
        } else if (ruleType === EventEligibilityRuleType.SPECIFIC_COURSE_GROUP) {
          value = { courseGroupId: ruleValue }
        }
      }
      const res = await fetch(`/api/v1/events/${event.id}/eligibility-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: ruleType, value, isRequired: true }),
      })
      if (res.ok) {
        const json = await res.json() as { data: EventEligibilityRuleDto }
        setEligibilityRules((prev) => [...prev, json.data])
        setRuleValue('')
      }
    } finally {
      setRuleSaving(false)
    }
  }

  async function handleDeleteRule(ruleId: string) {
    const res = await fetch(`/api/v1/events/${event.id}/eligibility-rules/${ruleId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.ok) setEligibilityRules((prev) => prev.filter((r) => r.id !== ruleId))
  }

  // ── Add reminder ───────────────────────────────────────────
  const [reminderForm, setReminderForm] = useState({
    type: 'BEFORE_24_HOURS',
    scheduledAt: '',
    channel: NotificationChannel.IN_APP,
  })
  const [reminderSaving, setReminderSaving] = useState(false)

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault()
    setReminderSaving(true)
    try {
      const res = await fetch(`/api/v1/events/${event.id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(reminderForm),
      })
      if (res.ok) {
        const json = await res.json() as { data: EventReminderDto }
        setReminders((prev) => [...prev, json.data])
      }
    } finally {
      setReminderSaving(false)
    }
  }

  // ── Announcement ───────────────────────────────────────────
  const [annForm, setAnnForm] = useState({ title: '', body: '' })
  const [annSaving, setAnnSaving] = useState(false)
  const [annResult, setAnnResult] = useState('')

  async function handleSendAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    setAnnSaving(true)
    try {
      const res = await fetch(`/api/v1/events/${event.id}/send-announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...annForm, channels: [NotificationChannel.IN_APP] }),
      })
      if (res.ok) {
        const json = await res.json() as { data: { sent: number } }
        setAnnResult(`اعلان برای ${json.data.sent} نفر ارسال شد.`)
        setAnnForm({ title: '', body: '' })
      }
    } finally {
      setAnnSaving(false)
    }
  }

  const isPaid = event.registrationMode === EventRegistrationMode.PAID

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] truncate">{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-[var(--color-text-muted)]">
            <span>{fa.eventType[event.type]}</span>
            <span>·</span>
            <span>{fa.eventDeliveryMode[event.deliveryMode]}</span>
            <span>·</span>
            <span>{fa.eventRegistrationMode[event.registrationMode]}</span>
            {event.priceToman > 0 && (
              <>
                <span>·</span>
                <span>{event.priceToman.toLocaleString('fa-IR')} تومان</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={event.status}
            onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
            disabled={statusUpdating}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]"
          >
            {Object.values(EventStatus).map((s) => (
              <option key={s} value={s}>{fa.eventStatus[s]}</option>
            ))}
          </select>
          <button
            onClick={() => router.push(`/events/${event.id}/edit`)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
          >
            {fa.ui.edit}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            {deleting ? '...' : fa.ui.delete}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        {TABS.filter((tab) => {
          if (tab.onlineOnly) {
            return event.deliveryMode === EventDeliveryMode.ONLINE || event.deliveryMode === EventDeliveryMode.HYBRID
          }
          return true
        }).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'shrink-0 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 text-[var(--color-brand-700)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
            style={activeTab === tab.key ? { borderColor: 'var(--color-brand-600)' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: اطلاعات ── */}
      {activeTab === 'info' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="زمان‌بندی">
            <Row label="شروع" value={new Date(event.startsAt).toLocaleString('fa-IR', { dateStyle: 'full', timeStyle: 'short' })} />
            {event.endsAt && <Row label="پایان" value={new Date(event.endsAt!).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })} />}
            {event.registrationDeadline && <Row label="مهلت ثبت‌نام" value={new Date(event.registrationDeadline!).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })} />}
            {event.capacity && <Row label="ظرفیت" value={`${event.capacity.toLocaleString('fa-IR')} نفر`} />}
            <Row label="ثبت‌نام‌شده" value={`${event.registrationCount.toLocaleString('fa-IR')} نفر`} />
          </Card>

          <Card title="برگزاری">
            {event.location && <Row label="مکان" value={event.location} />}
            {event.onlineUrl && (
              <Row label="لینک آنلاین" value={
                <a href={event.onlineUrl} target="_blank" rel="noreferrer" className="text-[var(--color-brand-600)] hover:underline truncate block">
                  {event.onlineUrl}
                </a>
              } />
            )}
            {event.meetinoJoinUrl && (
              <Row label="لینک میتینو" value={
                <a href={event.meetinoJoinUrl} target="_blank" rel="noreferrer" className="text-[var(--color-brand-600)] hover:underline truncate block">
                  {event.meetinoJoinUrl}
                </a>
              } />
            )}
            {event.meetinoMeetingId && <Row label="شناسه میتینو" value={event.meetinoMeetingId} />}
            {!event.location && !event.onlineUrl && !event.meetinoJoinUrl && (
              <p className="text-sm text-[var(--color-text-muted)]">اطلاعات برگزاری ثبت نشده است.</p>
            )}
          </Card>

          {event.description && (
            <Card title="توضیحات" className="md:col-span-2">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: ثبت‌نام‌ها ── */}
      {activeTab === 'registrations' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">
              مجموع: {registrations.total.toLocaleString('fa-IR')} ثبت‌نام
            </span>
            <button
              onClick={() => setShowRegModal(true)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--color-brand-600)' }}
            >
              {fa.eventRegistrations.addParticipant}
            </button>
          </div>

          {registrations.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-16 text-[var(--color-text-muted)]">
              <div className="mb-2 text-3xl">👥</div>
              <div>{fa.eventRegistrations.noRegistrations}</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.eventRegistrations.fullName}</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.eventRegistrations.mobile}</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.eventRegistrations.registrationStatus}</th>
                      {isPaid && <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.eventRegistrations.paymentStatus}</th>}
                      {isPaid && <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">{fa.eventRegistrations.paidAmount}</th>}
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {registrations.data.map((reg) => (
                      <tr key={reg.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{reg.fullName}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)] tabular-nums">{reg.mobile}</td>
                        <td className="px-4 py-3"><RegStatusBadge status={reg.status} /></td>
                        {isPaid && <td className="px-4 py-3"><PayStatusBadge status={reg.paymentStatus} /></td>}
                        {isPaid && (
                          <td className="px-4 py-3 text-[var(--color-text-secondary)] tabular-nums">
                            {reg.paidAmountToman > 0 ? `${reg.paidAmountToman.toLocaleString('fa-IR')} ت` : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {reg.status === EventRegistrationStatus.PENDING && (
                              <>
                                <ActionBtn onClick={() => handleRegStatus(reg.id, EventRegistrationStatus.APPROVED)} color="green">{fa.eventRegistrations.approve}</ActionBtn>
                                <ActionBtn onClick={() => handleRegStatus(reg.id, EventRegistrationStatus.REJECTED)} color="red">{fa.eventRegistrations.reject}</ActionBtn>
                              </>
                            )}
                            {reg.status === EventRegistrationStatus.APPROVED && (
                              <>
                                <ActionBtn onClick={() => handleCheckIn(reg.id)} color="blue">{fa.eventRegistrations.checkIn}</ActionBtn>
                                <ActionBtn onClick={() => handleRegStatus(reg.id, EventRegistrationStatus.NO_SHOW)} color="orange">{fa.eventRegistrations.markNoShow}</ActionBtn>
                                <ActionBtn onClick={() => handleRegStatus(reg.id, EventRegistrationStatus.CANCELLED)} color="gray">{fa.ui.cancel}</ActionBtn>
                              </>
                            )}
                            {isPaid && reg.paymentStatus !== EventRegistrationPaymentStatus.PAID && reg.paymentStatus !== EventRegistrationPaymentStatus.NOT_REQUIRED && (
                              <ActionBtn onClick={() => setPayModal(reg.id)} color="brand">{fa.eventRegistrations.recordPayment}</ActionBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: شرایط ورود ── */}
      {activeTab === 'eligibility' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">شرایط موجود</h3>
            {eligibilityRules.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">هیچ شرطی تعریف نشده است. رویداد برای همه قابل ثبت‌نام است.</p>
            ) : (
              <ul className="space-y-2">
                {eligibilityRules.map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {fa.eventEligibilityRuleType[rule.type]}
                      </span>
                      {rule.value && (
                        <span className="mr-2 text-xs text-[var(--color-text-muted)]">
                          ({JSON.stringify(rule.value)})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      {fa.ui.delete}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">افزودن شرط جدید</h3>
            <form onSubmit={handleAddRule} className="space-y-3">
              <select
                value={ruleType}
                onChange={(e) => { setRuleType(e.target.value as EventEligibilityRuleType); setRuleValue('') }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
              >
                {Object.values(EventEligibilityRuleType).map((t) => (
                  <option key={t} value={t}>{fa.eventEligibilityRuleType[t]}</option>
                ))}
              </select>
              {(ruleType === EventEligibilityRuleType.SPECIFIC_COURSE ||
                ruleType === EventEligibilityRuleType.COMPLETED_COURSE ||
                ruleType === EventEligibilityRuleType.SPECIFIC_COURSE_GROUP) && (
                <input
                  type="text"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder={
                    ruleType === EventEligibilityRuleType.SPECIFIC_COURSE_GROUP
                      ? 'شناسه گروه (UUID)'
                      : 'شناسه دوره (UUID)'
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
                />
              )}
              <button
                type="submit"
                disabled={ruleSaving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--color-brand-600)' }}
              >
                {ruleSaving ? '...' : 'افزودن شرط'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Tab: پرداخت‌ها ── */}
      {activeTab === 'payments' && (
        <div>
          {!isPaid ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-16 text-[var(--color-text-muted)]">
              <div className="mb-2 text-3xl">🆓</div>
              <div>این رویداد رایگان است و پرداختی ندارد.</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">نام</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">مبلغ</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">پرداخت‌شده</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">مانده</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">وضعیت</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {registrations.data.filter((r) => r.paymentStatus !== EventRegistrationPaymentStatus.NOT_REQUIRED).map((reg) => (
                      <tr key={reg.id} className="hover:bg-[var(--color-bg-subtle)]">
                        <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{reg.fullName}</td>
                        <td className="px-4 py-3 tabular-nums text-[var(--color-text-secondary)]">{reg.amountDueToman.toLocaleString('fa-IR')} ت</td>
                        <td className="px-4 py-3 tabular-nums text-[var(--color-text-secondary)]">{reg.paidAmountToman.toLocaleString('fa-IR')} ت</td>
                        <td className="px-4 py-3 tabular-nums text-[var(--color-text-secondary)]">{reg.remainingAmountToman.toLocaleString('fa-IR')} ت</td>
                        <td className="px-4 py-3"><PayStatusBadge status={reg.paymentStatus} /></td>
                        <td className="px-4 py-3">
                          {reg.paymentStatus !== EventRegistrationPaymentStatus.PAID && (
                            <ActionBtn onClick={() => setPayModal(reg.id)} color="brand">{fa.eventRegistrations.recordPayment}</ActionBtn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: یادآوری‌ها ── */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            {fa.eventRegistrations.eligibilityNote} {/* reusing a message slot */}
            ارسال پیام‌ها از طریق ماژول اعلان‌ها انجام می‌شود.
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">یادآوری‌های تعریف‌شده</h3>
            {reminders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">هیچ یادآوری‌ای تعریف نشده است.</p>
            ) : (
              <ul className="space-y-2">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">{fa.eventReminderType[r.type]}</span>
                      <span className="mr-2 text-[var(--color-text-muted)]">
                        · {new Date(r.scheduledAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}
                        · {fa.notificationChannel[r.channel]}
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {fa.eventReminderStatus[r.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">افزودن یادآوری</h3>
            <form onSubmit={handleAddReminder} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">نوع</label>
                  <select
                    value={reminderForm.type}
                    onChange={(e) => setReminderForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
                  >
                    {['REGISTRATION_CONFIRMATION', 'BEFORE_24_HOURS', 'BEFORE_1_HOUR', 'EVENT_STARTED', 'EVENT_CANCELLED'].map((t) => (
                      <option key={t} value={t}>{fa.eventReminderType[t as keyof typeof fa.eventReminderType]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">زمان ارسال</label>
                  <input
                    type="datetime-local"
                    required
                    value={reminderForm.scheduledAt}
                    onChange={(e) => setReminderForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">کانال</label>
                  <select
                    value={reminderForm.channel}
                    onChange={(e) => setReminderForm((f) => ({ ...f, channel: e.target.value as NotificationChannel }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
                  >
                    {Object.values(NotificationChannel).map((c) => (
                      <option key={c} value={c}>{fa.notificationChannel[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={reminderSaving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--color-brand-600)' }}
              >
                {reminderSaving ? '...' : 'ثبت یادآوری'}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">ارسال اطلاعیه به ثبت‌نام‌کنندگان</h3>
            {annResult && (
              <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {annResult}
              </div>
            )}
            <form onSubmit={handleSendAnnouncement} className="space-y-3">
              <input
                type="text"
                required
                placeholder="عنوان اطلاعیه"
                value={annForm.title}
                onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
              />
              <textarea
                required
                rows={3}
                placeholder="متن اطلاعیه"
                value={annForm.body}
                onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={annSaving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--color-brand-600)' }}
              >
                {annSaving ? '...' : 'ارسال اطلاعیه'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Tab: گزارش ── */}
      {activeTab === 'report' && (
        <div>
          {!report ? (
            <div className="flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-16 text-[var(--color-text-muted)]">
              اطلاعات گزارش در دسترس نیست.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ReportCard label={fa.eventReport.totalRegistrations} value={report.totalRegistrations} />
              <ReportCard label={fa.eventReport.approved} value={report.approvedCount} />
              <ReportCard label={fa.eventReport.attended} value={report.attendedCount} />
              <ReportCard label={fa.eventReport.waitlisted} value={report.waitlistedCount} />
              <ReportCard label={fa.eventReport.noShow} value={report.noShowCount} />
              {isPaid && (
                <>
                  <ReportCard label={fa.eventReport.paidCount} value={report.paidCount} />
                  <ReportCard label={fa.eventReport.unpaidCount} value={report.unpaidCount} />
                  <ReportCard label={fa.eventReport.expectedRevenue} value={`${report.totalExpectedRevenueToman.toLocaleString('fa-IR')} ت`} isText />
                  <ReportCard label={fa.eventReport.totalPaid} value={`${report.totalPaidToman.toLocaleString('fa-IR')} ت`} isText />
                  <ReportCard label={fa.eventReport.remaining} value={`${report.remainingToman.toLocaleString('fa-IR')} ت`} isText />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: جلسه میتینو ── */}
      {activeTab === 'meetino' && (
        <EventMeetinoSection eventId={event.id} deliveryMode={event.deliveryMode} />
      )}

      {/* ── Add Registration Modal ── */}
      {showRegModal && (
        <Modal title={fa.eventRegistrations.addParticipant} onClose={() => setShowRegModal(false)}>
          <form onSubmit={handleCreateReg} className="space-y-4">
            {regError && <div className="text-sm text-red-600">{regError}</div>}
            <Field label={fa.eventRegistrations.fullName} required>
              <ModalInput
                value={regForm.fullName}
                onChange={(v) => setRegForm((f) => ({ ...f, fullName: v }))}
                required
              />
            </Field>
            <Field label={fa.eventRegistrations.mobile} required>
              <ModalInput
                value={regForm.mobile}
                onChange={(v) => setRegForm((f) => ({ ...f, mobile: v }))}
                required
              />
            </Field>
            <Field label={fa.eventRegistrations.email}>
              <ModalInput
                value={regForm.email}
                onChange={(v) => setRegForm((f) => ({ ...f, email: v }))}
              />
            </Field>
            <Field label="یادداشت">
              <ModalInput
                value={regForm.notes}
                onChange={(v) => setRegForm((f) => ({ ...f, notes: v }))}
              />
            </Field>
            <div className="flex gap-2">
              <button type="submit" disabled={regSaving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--color-brand-600)' }}>
                {regSaving ? '...' : 'ثبت‌نام'}
              </button>
              <button type="button" onClick={() => setShowRegModal(false)} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm">
                {fa.ui.cancel}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Record Payment Modal ── */}
      {payModal && (
        <Modal title={fa.eventRegistrations.recordPayment} onClose={() => setPayModal(null)}>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {payError && <div className="text-sm text-red-600">{payError}</div>}
            <Field label={fa.payments.amountToman} required>
              <ModalInput
                value={payForm.amountToman}
                onChange={(v) => setPayForm((f) => ({ ...f, amountToman: v }))}
                type="number"
                required
              />
            </Field>
            <Field label={fa.payments.paymentMethod} required>
              <select
                value={payForm.method}
                onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm"
              >
                {Object.values(PaymentMethod).map((m) => (
                  <option key={m} value={m}>{fa.paymentMethod[m]}</option>
                ))}
              </select>
            </Field>
            <Field label={fa.payments.paidAt} required>
              <ModalInput
                type="datetime-local"
                value={payForm.paidAt}
                onChange={(v) => setPayForm((f) => ({ ...f, paidAt: v }))}
                required
              />
            </Field>
            <Field label={fa.payments.receiptNote}>
              <ModalInput
                value={payForm.receiptNote}
                onChange={(v) => setPayForm((f) => ({ ...f, receiptNote: v }))}
              />
            </Field>
            <div className="flex gap-2">
              <button type="submit" disabled={paySaving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--color-brand-600)' }}>
                {paySaving ? '...' : 'ثبت پرداخت'}
              </button>
              <button type="button" onClick={() => setPayModal(null)} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm">
                {fa.ui.cancel}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Reusable sub-components ───────────────────────────────────

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[var(--color-text-primary)] text-left">{value}</span>
    </div>
  )
}

function ReportCard({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-2 text-sm text-[var(--color-text-muted)]">{label}</div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">
        {isText ? value : (typeof value === 'number' ? value.toLocaleString('fa-IR') : value)}
      </div>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  color,
}: {
  children: React.ReactNode
  onClick: () => void
  color: 'green' | 'red' | 'blue' | 'orange' | 'gray' | 'brand'
}) {
  const cls: Record<string, string> = {
    green: 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400',
    red: 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400',
    blue: 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400',
    orange: 'border-orange-200 text-orange-600 hover:bg-orange-50',
    gray: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]',
    brand: 'border-[var(--color-brand-200)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)]',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${cls[color]}`}
    >
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
        {label}{required && <span className="mr-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function ModalInput({
  value, onChange, type = 'text', required,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
    />
  )
}

// ── EventMeetinoSection ─────────────────────────────────────────────────────

function EventMeetinoSection({ eventId, deliveryMode }: { eventId: string; deliveryMode: string }) {
  const [reference, setReference] = useState<import('@irno/types').MeetinoMeetingReferenceDto | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', startsAt: '', manualJoinUrl: '', createInMeetino: false })

  // Lazy-load reference on tab mount
  useState(() => {
    if (loaded) return
    setLoaded(true)
    fetch(`/api/v1/events/${eventId}/meetino`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setReference(d.data ?? d) })
      .catch(() => null)
  })

  if (deliveryMode === 'IN_PERSON') {
    return (
      <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        جلسه میتینو برای رویدادهای حضوری قابل تنظیم نیست.
      </div>
    )
  }

  async function handleAttach(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/events/${eventId}/meetino`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || undefined,
          startsAt: form.startsAt || undefined,
          manualJoinUrl: form.manualJoinUrl || undefined,
          createInMeetino: form.createInMeetino,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message ?? 'خطا در ثبت جلسه')
        return
      }
      const data = await res.json()
      setReference(data.data ?? data)
      setShowForm(false)
    } catch {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncLoading(true)
    setSyncMsg(null)
    try {
      const res = await fetch(`/api/v1/events/${eventId}/meetino/sync`, { method: 'POST' })
      const data = await res.json()
      setSyncMsg((data.data ?? data).message ?? 'همگام‌سازی انجام شد')
    } catch {
      setSyncMsg('خطا در همگام‌سازی')
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {reference ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="font-semibold text-[var(--color-text-primary)] mb-1">{reference.title}</p>
              <span className="text-xs text-[var(--color-text-muted)]">
                {fa.meetinoMeetingStatus[reference.status as keyof typeof fa.meetinoMeetingStatus] ?? reference.status}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncLoading}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
              >
                {syncLoading ? '...' : fa.meetino.syncAttendance}
              </button>
              <a
                href={reference.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white"
              >
                {fa.meetino.openInMeetino} ↗
              </a>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{fa.meetino.joinUrl}</p>
            <a href={reference.joinUrl} target="_blank" rel="noopener noreferrer"
              className="text-[var(--color-brand-600)] hover:underline break-all">
              {reference.joinUrl}
            </a>
          </div>

          {syncMsg && (
            <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
              {syncMsg}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
          <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
          <p className="text-sm mb-4">{fa.meetino.noSessionEvent}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm rounded-lg text-white"
            style={{ background: 'var(--color-brand-600)' }}
          >
            {fa.meetino.attachManual}
          </button>
        </div>
      )}

      {showForm && !reference && (
        <form onSubmit={handleAttach} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
          <h4 className="font-semibold text-[var(--color-text-primary)]">{fa.meetino.attachManual}</h4>

          <Field label={fa.meetino.sessionTitle}>
            <input type="text" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="اختیاری"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="evtCreateInMeetino" checked={form.createInMeetino}
              onChange={(e) => setForm({ ...form, createInMeetino: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="evtCreateInMeetino" className="text-sm text-[var(--color-text-secondary)]">
              {fa.meetino.createInMeeting}
            </label>
          </div>

          {!form.createInMeetino && (
            <Field label={fa.meetino.manualLinkLabel} required>
              <input type="url" value={form.manualJoinUrl}
                onChange={(e) => setForm({ ...form, manualJoinUrl: e.target.value })}
                placeholder="https://meet.irno.ir/m/..."
                required
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
            </Field>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              انصراف
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--color-brand-600)' }}>
              {loading ? 'در حال ثبت...' : 'ثبت جلسه'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
