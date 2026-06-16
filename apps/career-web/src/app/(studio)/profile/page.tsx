'use client'

import { useState, useEffect } from 'react'
import type { CareerProfileDto } from '@irno/types'
import { CareerProfileVisibility } from '@irno/types'
import { fa } from '@irno/i18n'

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'

const visibilityLabels: Record<CareerProfileVisibility, string> = {
  [CareerProfileVisibility.PRIVATE]: 'خصوصی — فقط برای خودم',
  [CareerProfileVisibility.PUBLIC_LINK]: 'با لینک عمومی — هر کسی با لینک می‌تواند ببیند',
  [CareerProfileVisibility.DISABLED]: 'غیرفعال',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<CareerProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    headline: '',
    summary: '',
    location: '',
    phone: '',
    email: '',
    website: '',
    linkedinUrl: '',
    githubUrl: '',
    avatarUrl: '',
    visibility: CareerProfileVisibility.PRIVATE as string,
    publicSlug: '',
  })

  useEffect(() => {
    fetch('/api/v1/career/me')
      .then((r) => r.json())
      .then((d) => {
        const p: CareerProfileDto = d?.data ?? d
        setProfile(p)
        setForm({
          displayName: p.displayName ?? '',
          headline: p.headline ?? '',
          summary: p.summary ?? '',
          location: p.location ?? '',
          phone: p.phone ?? '',
          email: p.email ?? '',
          website: p.website ?? '',
          linkedinUrl: p.linkedinUrl ?? '',
          githubUrl: p.githubUrl ?? '',
          avatarUrl: p.avatarUrl ?? '',
          visibility: p.visibility,
          publicSlug: p.publicSlug ?? '',
        })
      })
      .catch(() => setError('خطا در بارگذاری پروفایل.'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/v1/career/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName.trim() || undefined,
          headline: form.headline.trim() || null,
          summary: form.summary.trim() || null,
          location: form.location.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          website: form.website.trim() || null,
          linkedinUrl: form.linkedinUrl.trim() || null,
          githubUrl: form.githubUrl.trim() || null,
          avatarUrl: form.avatarUrl.trim() || null,
          visibility: form.visibility,
          publicSlug: form.publicSlug.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.message ?? 'خطا در ذخیره پروفایل.')
        return
      }
      setSuccess(true)
    } catch {
      setError('خطا در اتصال به سرور.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</div>
  }

  const publicUrl = form.publicSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/${form.publicSlug}`
    : null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">پروفایل عمومی</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          اطلاعات پروفایل Career Studio خود را ویرایش کنید.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-[var(--color-danger)] dark:bg-red-900/20 dark:border-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-[var(--color-success)] dark:bg-green-900/20 dark:border-green-800">
          پروفایل با موفقیت ذخیره شد.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            اطلاعات پایه
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                نام نمایشی
              </label>
              <input
                type="text"
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                تیتر حرفه‌ای
              </label>
              <input
                type="text"
                name="headline"
                value={form.headline}
                onChange={handleChange}
                placeholder="مثال: Frontend Developer at Irno"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              خلاصه / معرفی
            </label>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              موقعیت / شهر
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="تهران، ایران"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
            />
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            اطلاعات تماس
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                تلفن
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                ایمیل
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                وبسایت
              </label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                لینکدین
              </label>
              <input
                type="url"
                name="linkedinUrl"
                value={form.linkedinUrl}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                گیت‌هاب
              </label>
              <input
                type="url"
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                آدرس آواتار (URL)
              </label>
              <input
                type="url"
                name="avatarUrl"
                value={form.avatarUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
          </div>
        </div>

        {/* Visibility & slug */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            دسترسی و لینک عمومی
          </h2>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              دسترسی پروفایل
            </label>
            <select
              name="visibility"
              value={form.visibility}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
            >
              {Object.values(CareerProfileVisibility).map((v) => (
                <option key={v} value={v}>{visibilityLabels[v]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              اسلاگ عمومی
            </label>
            <input
              type="text"
              name="publicSlug"
              value={form.publicSlug}
              onChange={handleChange}
              placeholder="نام-کاربری-شما"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
            />
            {publicUrl && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                لینک عمومی:{' '}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-brand-600)] hover:underline"
                >
                  {publicUrl}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره پروفایل'}
          </button>
          {profile?.publicSlug && (
            <a
              href={`/public/${profile.publicSlug}`}
              target="_blank"
              className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-4 py-2 text-sm transition-colors"
            >
              مشاهده پروفایل عمومی ↗
            </a>
          )}
        </div>
      </form>
    </div>
  )
}
