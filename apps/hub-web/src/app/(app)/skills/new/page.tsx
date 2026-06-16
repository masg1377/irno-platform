'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { SkillLevel, SkillStatus } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewSkillPage() {
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
    const body: Record<string, unknown> = {
      title: fd.get('title'),
      slug: fd.get('slug'),
      description: fd.get('description') || undefined,
      category: categoryTitle || undefined,
      categoryId: categoryId || undefined,
      level: fd.get('level'),
      status: fd.get('status'),
    }

    try {
      const res = await fetch('/api/v1/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { data?: { id: string }; error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در ثبت مهارت'))
        setLoading(false)
        return
      }
      router.push(`/skills/${json.data!.id}`)
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
        <Link href="/skills" className="hover:text-[var(--color-text-primary)]">
          {fa.skills.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{fa.skills.newSkill}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">{fa.skills.newSkill}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        {/* Title */}
        <div>
          <label className={labelCls}>
            عنوان مهارت <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            className={inputCls}
            placeholder="مثال: ری‌اکت پیشرفته"
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
            placeholder="react-advanced"
            onInput={(e) => {
              ;(e.target as HTMLInputElement).dataset.touched = '1'
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>{fa.skills.category}</label>
          <TaxonomySelect
            type="SKILL_CATEGORY"
            value={categoryId}
            onChange={(id, title) => {
              setCategoryId(id)
              setCategoryTitle(title ?? '')
            }}
            placeholder="انتخاب دسته‌بندی مهارت..."
          />
        </div>

        {/* Level + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              {fa.skills.skillLevel} <span className="text-red-500">*</span>
            </label>
            <select name="level" defaultValue={SkillLevel.BEGINNER} className={inputCls}>
              {Object.values(SkillLevel).map((l) => (
                <option key={l} value={l}>
                  {fa.skillLevel[l as keyof typeof fa.skillLevel]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{fa.skills.status}</label>
            <select name="status" defaultValue={SkillStatus.ACTIVE} className={inputCls}>
              {Object.values(SkillStatus).map((s) => (
                <option key={s} value={s}>
                  {fa.skillStatus[s as keyof typeof fa.skillStatus]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>{fa.skills.description}</label>
          <textarea
            name="description"
            rows={4}
            className={inputCls}
            placeholder="توضیحات اختیاری مهارت..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره مهارت'}
          </button>
          <Link
            href="/skills"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            {fa.ui.cancel}
          </Link>
        </div>
      </form>
    </div>
  )
}
