'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import type { CertificateTemplateDto } from '@irno/types'

export default function CertificateTemplateDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [template, setTemplate] = useState<CertificateTemplateDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/v1/certificate-templates/${params.id}`, {
          credentials: 'include',
        })
        const raw = (await res.json()) as { data?: CertificateTemplateDto }
        if (!res.ok || !raw.data) {
          setError('قالب مدرک یافت نشد')
          setLoading(false)
          return
        }
        setTemplate(raw.data)
        setEditTitle(raw.data.title)
        setEditDescription(raw.data.description ?? '')
        setEditIsActive(raw.data.isActive)
      } catch {
        setError('خطا در اتصال به سرور')
      } finally {
        setLoading(false)
      }
    }
    void fetchTemplate()
  }, [params.id])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/certificate-templates/${params.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || undefined,
          isActive: editIsActive,
        }),
      })
      const raw = (await res.json()) as { data?: CertificateTemplateDto; message?: string }
      if (!res.ok) {
        setError(raw.message ?? 'خطا در ذخیره تغییرات')
        return
      }
      if (raw.data) {
        setTemplate(raw.data)
        setEditTitle(raw.data.title)
        setEditDescription(raw.data.description ?? '')
        setEditIsActive(raw.data.isActive)
      }
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('آیا از حذف این قالب اطمینان دارید؟')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/certificate-templates/${params.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        router.push('/certificate-templates')
      } else {
        setError('خطا در حذف قالب')
        setDeleting(false)
      }
    } catch {
      setError('خطا در اتصال به سرور')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">قالب مدرک یافت نشد.</p>
        <Link href="/certificate-templates" className="mt-4 inline-block text-sm text-[var(--color-brand-600)] hover:underline">
          بازگشت به لیست
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/certificate-templates" className="hover:text-[var(--color-text-primary)]">
          {fa.certificates.templates}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{template.title}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{template.title}</h1>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {deleting ? 'در حال حذف...' : 'حذف قالب'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Info card */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">اطلاعات قالب</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <dt className="text-[var(--color-text-muted)]">Slug</dt>
            <dd className="font-mono text-[var(--color-text-primary)]" dir="ltr">{template.slug}</dd>
          </div>
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <dt className="text-[var(--color-text-muted)]">نوع</dt>
            <dd className="text-[var(--color-text-primary)]">
              {fa.certificateTemplateType[template.type as keyof typeof fa.certificateTemplateType] ?? template.type}
            </dd>
          </div>
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <dt className="text-[var(--color-text-muted)]">زبان</dt>
            <dd className="text-[var(--color-text-primary)]">
              {fa.certificateLanguage[template.language as keyof typeof fa.certificateLanguage] ?? template.language}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-muted)]">تاریخ ایجاد</dt>
            <dd className="text-[var(--color-text-primary)]">
              {new Date(template.createdAt).toLocaleDateString('fa-IR')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Edit form */}
      <form onSubmit={(e) => void handleSave(e)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">ویرایش</h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">عنوان</label>
          <input
            type="text"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">توضیحات</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="editIsActive"
            checked={editIsActive}
            onChange={(e) => setEditIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)]"
          />
          <label htmlFor="editIsActive" className="text-sm text-[var(--color-text-primary)]">قالب فعال است</label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50"
        >
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </form>
    </div>
  )
}
