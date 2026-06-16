'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'
import { EventType, EventDeliveryMode, EventRegistrationMode, EventStatus } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

export default function NewEventPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    type: EventType.WEBINAR,
    deliveryMode: EventDeliveryMode.ONLINE,
    registrationMode: EventRegistrationMode.FREE,
    status: EventStatus.DRAFT,
    startsAt: '',
    endsAt: '',
    location: '',
    onlineUrl: '',
    meetinoJoinUrl: '',
    capacity: '',
    priceToman: '0',
    registrationDeadline: '',
    categoryId: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 150)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.registrationMode === EventRegistrationMode.PAID && parseInt(form.priceToman) <= 0) {
      setError('رویداد پولی باید قیمت بیشتر از صفر داشته باشد')
      return
    }
    if (form.registrationMode === EventRegistrationMode.FREE && parseInt(form.priceToman) > 0) {
      setError('رویداد رایگان نمی‌تواند قیمت داشته باشد')
      return
    }
    if (form.deliveryMode === EventDeliveryMode.IN_PERSON && !form.location) {
      setError('رویداد حضوری نیاز به مکان برگزاری دارد')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        slug: form.slug || autoSlug(form.title),
        description: form.description || undefined,
        type: form.type,
        deliveryMode: form.deliveryMode,
        registrationMode: form.registrationMode,
        status: form.status,
        startsAt: form.startsAt,
        priceToman: parseInt(form.priceToman) || 0,
        categoryId: form.categoryId || undefined,
      }
      if (form.endsAt) body['endsAt'] = form.endsAt
      if (form.location) body['location'] = form.location
      if (form.onlineUrl) body['onlineUrl'] = form.onlineUrl
      if (form.meetinoJoinUrl) body['meetinoJoinUrl'] = form.meetinoJoinUrl
      if (form.capacity) body['capacity'] = parseInt(form.capacity)
      if (form.registrationDeadline) body['registrationDeadline'] = form.registrationDeadline

      const res = await fetch('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json() as { message?: string }
        setError(err.message ?? fa.errors.generic)
        return
      }

      const json = await res.json() as { data: { id: string } }
      router.push(`/events/${json.data.id}`)
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setSaving(false)
    }
  }

  const needsLocation = form.deliveryMode === EventDeliveryMode.IN_PERSON
  const needsOnline =
    form.deliveryMode === EventDeliveryMode.ONLINE ||
    form.deliveryMode === EventDeliveryMode.HYBRID
  const isPaid = form.registrationMode === EventRegistrationMode.PAID

  return (
    <div dir="rtl" className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.events.newEvent}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.events.meetinoNote}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">اطلاعات اصلی</h2>
          <div className="space-y-4">
            <Field label={fa.events.title_} required>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => {
                  set('title', e.target.value)
                  if (!form.slug) set('slug', autoSlug(e.target.value))
                }}
                className={inputCls}
              />
            </Field>
            <Field label={fa.events.slug} hint="فقط حروف انگلیسی، اعداد و خط تیره">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder={autoSlug(form.title) || 'event-slug'}
                className={inputCls}
              />
            </Field>
            <Field label={fa.events.description}>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <Field label={fa.taxonomy.selectCategory}>
              <TaxonomySelect
                type="EVENT_CATEGORY"
                value={form.categoryId}
                onChange={(id) => set('categoryId', id)}
                placeholder="انتخاب دسته‌بندی رویداد..."
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">نوع و نحوه برگزاری</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={fa.events.type} required>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
                {Object.values(EventType).map((t) => (
                  <option key={t} value={t}>{fa.eventType[t]}</option>
                ))}
              </select>
            </Field>
            <Field label={fa.events.deliveryMode} required>
              <select value={form.deliveryMode} onChange={(e) => set('deliveryMode', e.target.value)} className={inputCls}>
                {Object.values(EventDeliveryMode).map((m) => (
                  <option key={m} value={m}>{fa.eventDeliveryMode[m]}</option>
                ))}
              </select>
            </Field>
            <Field label={fa.events.registrationMode} required>
              <select
                value={form.registrationMode}
                onChange={(e) => {
                  set('registrationMode', e.target.value)
                  if (e.target.value === EventRegistrationMode.FREE) set('priceToman', '0')
                }}
                className={inputCls}
              >
                {Object.values(EventRegistrationMode).map((m) => (
                  <option key={m} value={m}>{fa.eventRegistrationMode[m]}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">زمان و مکان</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={fa.events.startsAt} required>
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={fa.events.endsAt}>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={fa.events.registrationDeadline}>
              <input
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => set('registrationDeadline', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={fa.events.capacity}>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => set('capacity', e.target.value)}
                placeholder="نامحدود"
                className={inputCls}
              />
            </Field>
          </div>

          {needsLocation && (
            <div className="mt-4">
              <Field label={fa.events.location} required>
                <input
                  type="text"
                  required={needsLocation}
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="آدرس یا نام مکان برگزاری"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {needsOnline && (
            <div className="mt-4 space-y-4">
              <Field label={fa.events.onlineUrl} hint="لینک آنلاین عمومی">
                <input
                  type="url"
                  value={form.onlineUrl}
                  onChange={(e) => set('onlineUrl', e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>
              <Field label={fa.events.meetinoJoinUrl} hint="لینک اتاق میتینو برای برگزاری آنلاین">
                <input
                  type="url"
                  value={form.meetinoJoinUrl}
                  onChange={(e) => set('meetinoJoinUrl', e.target.value)}
                  placeholder="https://meet.irno.ir/..."
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </div>

        {isPaid && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">قیمت‌گذاری</h2>
            <Field label={fa.events.priceToman} required>
              <input
                type="number"
                min="1"
                required={isPaid}
                value={form.priceToman}
                onChange={(e) => set('priceToman', e.target.value)}
                placeholder="مبلغ به تومان"
                className={inputCls}
              />
            </Field>
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <Field label={fa.events.status} required>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              {Object.values(EventStatus).map((s) => (
                <option key={s} value={s}>{fa.eventStatus[s]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--color-brand-600)' }}
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره رویداد'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-[var(--color-border)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)]"
          >
            {fa.ui.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
        {required && <span className="mr-0.5 text-red-500">*</span>}
        {hint && <span className="mr-1 text-xs text-[var(--color-text-muted)]">({hint})</span>}
      </label>
      {children}
    </div>
  )
}
