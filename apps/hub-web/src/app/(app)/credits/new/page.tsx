'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { CreditType, CreditStatus } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewCreditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [categoryTitle, setCategoryTitle] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const expiresRaw = fd.get('expiresAfterDays')
    const body: Record<string, unknown> = {
      title: fd.get('title'),
      slug: fd.get('slug'),
      description: fd.get('description') || undefined,
      category: categoryTitle || undefined,
      categoryId: categoryId || undefined,
      type: fd.get('type'),
      status: fd.get('status'),
      expiresAfterDays: expiresRaw ? Number(expiresRaw) : undefined,
    }

    try {
      const res = await fetch('/api/v1/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { data?: { id: string }; error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در ثبت اعتبار'))
        setLoading(false)
        return
      }
      router.push(`/credits/${json.data!.id}`)
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20'
  const labelCls = 'mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]'

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/credits" className="hover:text-[var(--color-text-primary)]">
          {fa.credits.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{fa.credits.newCredit}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">{fa.credits.newCredit}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        {/* Title */}
        <div>
          <label className={labelCls}>
            عنوان اعتبار <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            className={inputCls}
            placeholder="مثال: تکمیل دوره ری‌اکت"
            onChange={(e) => {
              const slugInput = document.querySelector<HTMLInputElement>('[name="slug"]')
              if (slugInput && !slugInput.dataset.touched) {
                slugInput.value = autoSlug(e.target.value)
              }
            }}
          />
        </div>

        {/* Slug */}
        <div>
          <label className={labelCls}>
            Slug <span className="text-red-500">*</span>
            <span className="mr-2 text-xs font-normal text-[var(--color-text-muted)]">
              (حروف کوچک انگلیسی، اعداد و خط تیره)
            </span>
          </label>
          <input
            name="slug"
            required
            dir="ltr"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className={inputCls}
            placeholder="react-course-completion"
            onInput={(e) => {
              ;(e.target as HTMLInputElement).dataset.touched = '1'
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>{fa.taxonomy.selectCategory}</label>
          <TaxonomySelect
            type="CREDIT_CATEGORY"
            value={categoryId}
            onChange={(id, title) => {
              setCategoryId(id)
              setCategoryTitle(title ?? '')
            }}
            placeholder="انتخاب دسته‌بندی اعتبار..."
          />
        </div>

        {/* Type + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              {fa.credits.creditType} <span className="text-red-500">*</span>
            </label>
            <select name="type" defaultValue={CreditType.MANUAL} className={inputCls}>
              {Object.values(CreditType).map((t) => (
                <option key={t} value={t}>
                  {fa.creditType[t as keyof typeof fa.creditType]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{fa.credits.status}</label>
            <select name="status" defaultValue={CreditStatus.ACTIVE} className={inputCls}>
              {Object.values(CreditStatus).map((s) => (
                <option key={s} value={s}>
                  {fa.creditStatus[s as keyof typeof fa.creditStatus]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expires after days */}
        <div>
          <label className={labelCls}>
            {fa.credits.expiresAfterDays}
            <span className="mr-2 text-xs font-normal text-[var(--color-text-muted)]">
              (اختیاری — خالی بگذارید اگر انقضا ندارد)
            </span>
          </label>
          <input
            name="expiresAfterDays"
            type="number"
            min="1"
            step="1"
            className={inputCls}
            placeholder="مثال: ۳۶۵"
            dir="ltr"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>توضیحات</label>
          <textarea
            name="description"
            rows={4}
            className={inputCls}
            placeholder="توضیحات اختیاری اعتبار..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره اعتبار'}
          </button>
          <Link
            href="/credits"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            {fa.ui.cancel}
          </Link>
        </div>
      </form>
    </div>
  )
}
