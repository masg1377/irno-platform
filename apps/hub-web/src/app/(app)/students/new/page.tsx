'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { fa } from '@irno/i18n'
import { StudentStatus } from '@irno/types'

export default function NewStudentPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const data = Object.fromEntries(new FormData(e.currentTarget))
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== '') payload[k] = v
    }

    try {
      const res = await fetch('/api/v1/students', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = (await res.json()) as { message?: string; data?: { id: string } }

      if (!res.ok) {
        setError(json.message ?? fa.errors.generic)
        return
      }

      router.push(`/students/${json.data?.id ?? ''}`)
      router.refresh()
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {fa.students.newStudent}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.students.subtitle}</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={fa.students.firstName} required>
              <input name="firstName" type="text" required minLength={1} maxLength={100} className={inputCls} />
            </Field>
            <Field label={fa.students.lastName} required>
              <input name="lastName" type="text" required minLength={1} maxLength={100} className={inputCls} />
            </Field>
          </div>

          <Field label={fa.students.mobile} required>
            <input
              name="mobile"
              type="tel"
              required
              pattern="^(\+98|0)?9[0-9]{9}$"
              className={inputCls}
              placeholder="09123456789"
              dir="ltr"
            />
          </Field>

          <Field label={fa.students.email}>
            <input name="email" type="email" className={inputCls} dir="ltr" />
          </Field>

          <Field label={fa.students.city}>
            <input name="city" type="text" maxLength={100} className={inputCls} />
          </Field>

          <Field label={fa.students.status}>
            <select name="status" className={inputCls} defaultValue={StudentStatus.ACTIVE}>
              {Object.values(StudentStatus).map((s) => (
                <option key={s} value={s}>
                  {fa.studentStatus[s as keyof typeof fa.studentStatus] ?? s}
                </option>
              ))}
            </select>
          </Field>

          <Field label={fa.students.internalNotes}>
            <textarea name="internalNotes" rows={3} maxLength={5000} className={inputCls} />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
            >
              {loading ? 'در حال ثبت...' : 'ثبت دانشجو'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20'
