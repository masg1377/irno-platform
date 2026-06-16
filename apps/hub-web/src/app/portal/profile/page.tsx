'use client'

import { useState, useEffect } from 'react'
import { fa } from '@irno/i18n'

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:opacity-60'

const btnPrimary =
  'rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/40 transition-colors'

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  city: string
  avatarUrl: string
  mobile: string
  role: string
  hasPassword: boolean
}

// ─── Password Section ──────────────────────────────────────────────────────────

function PasswordSection({ hasPassword: initialHasPassword }: { hasPassword: boolean }) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword)
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'رمز عبور جدید و تکرار آن یکسان نیستند.' })
      return
    }
    if (form.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = {
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      }
      if (hasPassword && form.currentPassword) {
        body.currentPassword = form.currentPassword
      }

      const res = await fetch('/api/v1/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const raw = (await res.json()) as { data?: { message?: string }; message?: string }
      const json = raw.data ?? raw

      if (!res.ok) {
        setMessage({ type: 'error', text: (json as { message?: string }).message ?? 'خطا در تنظیم رمز عبور' })
        return
      }

      setMessage({ type: 'success', text: json.message ?? (hasPassword ? 'رمز عبور با موفقیت تغییر کرد.' : 'رمز عبور با موفقیت تنظیم شد.') })
      setHasPassword(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setMessage({ type: 'error', text: 'خطا در ارتباط با سرور' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
    >
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">
        {hasPassword ? 'تغییر رمز عبور' : 'تعریف رمز عبور'}
      </h2>

      {!hasPassword && (
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">
          شما همچنان می‌توانید با کد یک‌بارمصرف وارد شوید. تعریف رمز عبور فقط یک روش ورود دیگر به حساب ایرنو اضافه می‌کند.
        </p>
      )}

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {hasPassword && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              رمز عبور فعلی <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="password"
              name="currentPassword"
              dir="ltr"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={inputCls}
              required
              disabled={saving}
              autoComplete="current-password"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            رمز عبور جدید <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="password"
            name="newPassword"
            dir="ltr"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="••••••••"
            className={inputCls}
            required
            minLength={8}
            disabled={saving}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            حداقل ۸ کاراکتر، شامل حرف و عدد
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            تکرار رمز عبور <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            dir="ltr"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            className={inputCls}
            required
            disabled={saving}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving || !form.newPassword || !form.confirmPassword || (hasPassword && !form.currentPassword)}
          className={btnPrimary}
        >
          {saving ? 'در حال ذخیره...' : hasPassword ? 'تغییر رمز عبور' : 'ثبت رمز عبور'}
        </button>
      </div>
    </form>
  )
}

// ─── Main profile page ────────────────────────────────────────────────────────

export default function PortalProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    city: '',
    avatarUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/v1/portal/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const raw = json.data ?? json
        const me = raw.data ?? raw
        setProfileData({
          firstName: me.profile?.firstName ?? '',
          lastName: me.profile?.lastName ?? '',
          email: me.email ?? '',
          city: me.profile?.city ?? '',
          avatarUrl: me.profile?.avatarUrl ?? '',
          mobile: me.mobile,
          role: me.role,
          hasPassword: Boolean(me.hasPassword),
        })
        setForm({
          firstName: me.profile?.firstName ?? '',
          lastName: me.profile?.lastName ?? '',
          email: me.email ?? '',
          city: me.profile?.city ?? '',
          avatarUrl: me.profile?.avatarUrl ?? '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/v1/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || null,
          city: form.city || null,
          avatarUrl: form.avatarUrl || null,
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: fa.portal.profileSaved })
      } else {
        const raw = (await res.json()) as { data?: { message?: string }; message?: string }
        const body = raw.data ?? raw
        setMessage({ type: 'error', text: body.message ?? 'خطا در ذخیره پروفایل' })
      }
    } catch {
      setMessage({ type: 'error', text: 'خطا در ارتباط با سرور' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="max-w-2xl">
        <div className="h-64 animate-pulse rounded-xl bg-[var(--color-bg-subtle)]" />
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.myProfile}
      </h1>

      {/* Read-only account info */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">اطلاعات حساب</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-[var(--color-text-muted)]">شماره موبایل</span>
            <p className="mt-0.5 font-medium text-[var(--color-text-primary)]" dir="ltr">
              {profileData?.mobile}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{fa.portal.mobileNote}</p>
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-muted)]">نقش</span>
            <p className="mt-0.5 font-medium text-[var(--color-text-primary)]">
              {fa.roles[profileData?.role as keyof typeof fa.roles] ?? profileData?.role}
            </p>
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-muted)]">وضعیت رمز عبور</span>
            <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">
              {profileData?.hasPassword ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span>●</span> رمز عبور تعریف شده
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
                  <span>○</span> بدون رمز عبور — ورود با کد یک‌بارمصرف
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Editable profile form */}
      <form onSubmit={handleSave} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-muted)]">اطلاعات شخصی</h2>

        {message && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {fa.portal.firstName}
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {fa.portal.lastName}
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {fa.portal.email}
              <span className="mr-1 text-xs text-[var(--color-text-muted)]">(اختیاری)</span>
            </label>
            <input
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="example@email.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              {fa.portal.city}
              <span className="mr-1 text-xs text-[var(--color-text-muted)]">(اختیاری)</span>
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
            {fa.portal.avatarUrl}
            <span className="mr-1 text-xs text-[var(--color-text-muted)]">(اختیاری)</span>
          </label>
          <input
            type="url"
            dir="ltr"
            value={form.avatarUrl}
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            placeholder="https://..."
            className={inputCls}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? 'در حال ذخیره...' : fa.ui.save}
          </button>
        </div>
      </form>

      {/* Password management section */}
      {profileData !== null && (
        <PasswordSection hasPassword={profileData.hasPassword} />
      )}
    </div>
  )
}
