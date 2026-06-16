'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResumeLanguage, ResumeVisibility } from '@irno/types'
import { fa } from '@irno/i18n'

export default function NewResumePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    targetRole: '',
    language: ResumeLanguage.FA as string,
    visibility: ResumeVisibility.PRIVATE as string,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('عنوان رزومه الزامی است.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/career/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          targetRole: form.targetRole.trim() || undefined,
          language: form.language,
          visibility: form.visibility,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? 'خطا در ایجاد رزومه.')
        return
      }
      const data = await res.json()
      const id = data?.data?.id ?? data?.id
      if (id) {
        router.push(`/resumes/${id}`)
      } else {
        router.push('/resumes')
      }
    } catch {
      setError('خطا در اتصال به سرور.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">ساخت رزومه جدید</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          مشخصات اولیه رزومه را وارد کنید. بعداً می‌توانید بخش‌ها را ویرایش کنید.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-[var(--color-danger)] dark:bg-red-900/20 dark:border-red-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            عنوان رزومه <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="مثال: رزومه فرانت‌اند — ۱۴۰۳"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            موقعیت هدف
          </label>
          <input
            type="text"
            name="targetRole"
            value={form.targetRole}
            onChange={handleChange}
            placeholder="مثال: Frontend Developer"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            زبان رزومه
          </label>
          <select
            name="language"
            value={form.language}
            onChange={handleChange}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
          >
            {Object.values(ResumeLanguage).map((lang) => (
              <option key={lang} value={lang}>
                {fa.resumeLanguage[lang]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            دسترسی
          </label>
          <select
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
          >
            {Object.values(ResumeVisibility).map((v) => (
              <option key={v} value={v}>
                {fa.resumeVisibility[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'در حال ایجاد...' : 'ساخت رزومه'}
          </button>
          <a
            href="/resumes"
            className="border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-lg px-4 py-2 text-sm transition-colors"
          >
            انصراف
          </a>
        </div>
      </form>
    </div>
  )
}
