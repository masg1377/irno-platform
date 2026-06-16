'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { CertificateTemplateType, CertificateLanguage } from '@irno/types'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NewCertificateTemplatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<CertificateTemplateType>(CertificateTemplateType.COURSE_COMPLETION)
  const [language, setLanguage] = useState<CertificateLanguage>(CertificateLanguage.FA)
  const [isActive, setIsActive] = useState(true)
  const [slugTouched, setSlugTouched] = useState(false)

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(toSlug(v))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/certificate-templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, description: description || undefined, type, language, isActive }),
      })
      const raw = (await res.json()) as { message?: string; data?: unknown }
      if (!res.ok) {
        setError(raw.message ?? 'خطا در ایجاد قالب')
        setLoading(false)
        return
      }
      router.push('/certificate-templates')
      router.refresh()
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/certificate-templates" className="hover:text-[var(--color-text-primary)]">
          {fa.certificates.templates}
        </Link>
        <span>/</span>
        <span>قالب جدید</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">قالب مدرک جدید</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              عنوان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="مثال: گواهی اتمام دوره React"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              dir="ltr"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
              placeholder="course-completion"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">فقط حروف کوچک، اعداد و خط تیره</p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              توضیحات
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="توضیح کوتاه درباره این قالب..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              نوع مدرک <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CertificateTemplateType)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
            >
              {Object.values(CertificateTemplateType).map((t) => (
                <option key={t} value={t}>
                  {fa.certificateTemplateType[t as keyof typeof fa.certificateTemplateType]}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              زبان مدرک
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CertificateLanguage)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
            >
              {Object.values(CertificateLanguage).map((l) => (
                <option key={l} value={l}>
                  {fa.certificateLanguage[l as keyof typeof fa.certificateLanguage]}
                </option>
              ))}
            </select>
          </div>

          {/* isActive */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)]"
            />
            <label htmlFor="isActive" className="text-sm text-[var(--color-text-primary)]">
              قالب فعال است
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره قالب'}
          </button>
          <Link
            href="/certificate-templates"
            className="rounded-lg border border-[var(--color-border)] px-6 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            انصراف
          </Link>
        </div>
      </form>
    </div>
  )
}
