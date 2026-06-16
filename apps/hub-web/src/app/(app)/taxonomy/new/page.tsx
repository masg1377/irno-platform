'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { TaxonomyTermType, TaxonomyTermStatus } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewTaxonomyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Controlled fields
  const [selectedType, setSelectedType] = useState('')
  const [parentId, setParentId] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugValue, setSlugValue] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const sortRaw = fd.get('sortOrder')
    const body: Record<string, unknown> = {
      type: selectedType || fd.get('type'),
      title: fd.get('title'),
      slug: slugValue || fd.get('slug'),
      description: fd.get('description') || undefined,
      status: fd.get('status') || TaxonomyTermStatus.ACTIVE,
      sortOrder: sortRaw ? Number(sortRaw) : 0,
    }
    if (parentId) body['parentId'] = parentId
    const color = fd.get('color') as string
    if (color && color !== '#000000') body['color'] = color
    const icon = fd.get('icon') as string
    if (icon) body['icon'] = icon

    try {
      const res = await fetch('/api/v1/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { data?: { id: string }; error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در ثبت دسته‌بندی'))
        setLoading(false)
        return
      }
      router.push(`/taxonomy/${json.data!.id}`)
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
        <Link href="/taxonomy" className="hover:text-[var(--color-text-primary)]">
          {fa.taxonomy.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{fa.taxonomy.newTerm}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">{fa.taxonomy.newTerm}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        {/* Type */}
        <div>
          <label className={labelCls}>
            {fa.taxonomy.type} <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            required
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value)
              // Reset parent when type changes
              setParentId('')
            }}
            className={inputCls}
          >
            <option value="">{fa.lookup.selectPlaceholder}</option>
            {Object.values(TaxonomyTermType).map((t) => (
              <option key={t} value={t}>
                {fa.taxonomyTermType[t as keyof typeof fa.taxonomyTermType]}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className={labelCls}>
            {fa.taxonomy.termTitle} <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            className={inputCls}
            placeholder="مثال: برنامه‌نویسی فرانت‌اند"
            onChange={(e) => {
              if (!slugTouched) {
                setSlugValue(autoSlug(e.target.value))
              }
            }}
          />
        </div>

        {/* Slug */}
        <div>
          <label className={labelCls}>
            {fa.taxonomy.slug} <span className="text-red-500">*</span>
            <span className="mr-2 text-xs font-normal text-[var(--color-text-muted)]">
              (حروف کوچک انگلیسی، اعداد و خط تیره)
            </span>
          </label>
          <input
            name="slug"
            required
            dir="ltr"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slugValue}
            onChange={(e) => {
              setSlugValue(e.target.value)
              setSlugTouched(true)
            }}
            className={inputCls}
            placeholder="frontend-programming"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>{fa.taxonomy.description}</label>
          <textarea
            name="description"
            rows={3}
            className={inputCls}
            placeholder="توضیحات اختیاری..."
          />
        </div>

        {/* Parent category — only shown when type is selected */}
        {selectedType && (
          <div>
            <label className={labelCls}>{fa.taxonomy.parentCategory}</label>
            <TaxonomySelect
              type={selectedType}
              value={parentId}
              onChange={(id) => setParentId(id)}
              placeholder={fa.taxonomy.noCategory}
            />
          </div>
        )}

        {/* Status + Sort Order */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{fa.taxonomy.status}</label>
            <select name="status" defaultValue={TaxonomyTermStatus.ACTIVE} className={inputCls}>
              {Object.values(TaxonomyTermStatus).map((s) => (
                <option key={s} value={s}>
                  {fa.taxonomyTermStatus[s as keyof typeof fa.taxonomyTermStatus]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{fa.taxonomy.sortOrder}</label>
            <input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className={inputCls}
              dir="ltr"
            />
          </div>
        </div>

        {/* Color + Icon */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{fa.taxonomy.color}</label>
            <input
              name="color"
              type="color"
              className="h-10 w-full cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-1"
            />
          </div>
          <div>
            <label className={labelCls}>{fa.taxonomy.icon}</label>
            <input
              name="icon"
              className={inputCls}
              placeholder="مثال: code یا emoji"
              dir="ltr"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره دسته‌بندی'}
          </button>
          <Link
            href="/taxonomy"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            {fa.ui.cancel}
          </Link>
        </div>
      </form>
    </div>
  )
}
