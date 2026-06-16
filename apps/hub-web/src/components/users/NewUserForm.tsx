'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@irno/types'
import { fa } from '@irno/i18n'

const roleOptions = [
  { value: UserRole.STUDENT, label: fa.roles.STUDENT },
  { value: UserRole.TEACHER, label: fa.roles.TEACHER },
  { value: UserRole.MENTOR, label: fa.roles.MENTOR },
  { value: UserRole.ACCOUNTANT, label: fa.roles.ACCOUNTANT },
  { value: UserRole.ADMIN, label: fa.roles.ADMIN },
]

export function NewUserForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    mobile: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    city: '',
    role: UserRole.STUDENT,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const body = {
        mobile: form.mobile,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        ...(form.email && { email: form.email }),
        ...(form.city && { city: form.city }),
      }

      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const json = (await res.json()) as { message?: string; error?: string }

      if (!res.ok) {
        setError(json.message ?? fa.errors.generic)
        return
      }

      router.push('/users')
      router.refresh()
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label={fa.users.firstName} required>
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            disabled={loading}
            className={inputCls}
          />
        </Field>
        <Field label={fa.users.lastName} required>
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            disabled={loading}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label={fa.users.mobile} required>
        <input
          name="mobile"
          type="tel"
          value={form.mobile}
          onChange={handleChange}
          placeholder="09xxxxxxxxx"
          dir="ltr"
          required
          disabled={loading}
          className={inputCls}
        />
      </Field>

      <Field label={`${fa.users.email} (${fa.ui.optional})`}>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          dir="ltr"
          disabled={loading}
          className={inputCls}
        />
      </Field>

      <Field label={fa.users.password} required>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="حداقل ۸ کاراکتر"
          dir="ltr"
          required
          minLength={8}
          disabled={loading}
          className={inputCls}
        />
      </Field>

      <Field label={fa.users.role}>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          disabled={loading}
          className={inputCls}
        >
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`${fa.users.city} (${fa.ui.optional})`}>
        <input
          name="city"
          value={form.city}
          onChange={handleChange}
          disabled={loading}
          className={inputCls}
        />
      </Field>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'در حال ذخیره...' : fa.users.addUser}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
        >
          {fa.ui.cancel}
        </button>
      </div>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:cursor-not-allowed disabled:opacity-60'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
        {required && <span className="mr-1 text-[var(--color-danger)]">*</span>}
      </label>
      {children}
    </div>
  )
}
