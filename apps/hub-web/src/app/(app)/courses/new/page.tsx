'use client'

import type { Metadata } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { CourseStatus, CourseLevel } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

export default function NewCoursePage() {
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
      defaultTuitionToman: fd.get('defaultTuitionToman') ? Number(fd.get('defaultTuitionToman')) : undefined,
      status: fd.get('status'),
    }

    try {
      const res = await fetch('/api/v1/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json() as { data?: { id: string }; error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در ثبت دوره'))
        setLoading(false)
        return
      }
      router.push(`/courses/${json.data!.id}`)
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  function autoSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ\s-]/g, '')
      .replace(/[؀-ۿ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const inputCls = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
  const labelCls = "mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/courses" className="hover:text-[var(--color-text-primary)]">{fa.courses.title}</Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{fa.courses.newCourse}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">{fa.courses.newCourse}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        <div>
          <label className={labelCls}>{fa.courses.name} <span className="text-red-500">*</span></label>
          <input
            name="title"
            required
            className={inputCls}
            placeholder="مثال: دوره ری‌اکت پیشرفته"
            onChange={(e) => {
              const slugInput = document.querySelector<HTMLInputElement>('[name="slug"]')
              if (slugInput && !slugInput.dataset.touched) {
                slugInput.value = autoSlug(e.target.value)
              }
            }}
          />
        </div>

        <div>
          <label className={labelCls}>
            Slug <span className="text-red-500">*</span>
            <span className="mr-2 text-xs font-normal text-[var(--color-text-muted)]">(حروف کوچک انگلیسی، اعداد و خط تیره)</span>
          </label>
          <input
            name="slug"
            required
            dir="ltr"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className={inputCls}
            placeholder="react-advanced"
            onInput={(e) => { (e.target as HTMLInputElement).dataset.touched = '1' }}
          />
        </div>

        <div>
          <label className={labelCls}>دسته‌بندی</label>
          <TaxonomySelect
            type="COURSE_CATEGORY"
            value={categoryId}
            onChange={(id, title) => {
              setCategoryId(id)
              setCategoryTitle(title ?? '')
            }}
            placeholder="انتخاب دسته‌بندی..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{fa.courses.status}</label>
            <select name="status" defaultValue={CourseStatus.DRAFT} className={inputCls}>
              {Object.values(CourseStatus).map((s) => (
                <option key={s} value={s}>{fa.courseStatus[s as keyof typeof fa.courseStatus]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>سطح دوره</label>
            <select name="level" defaultValue={CourseLevel.ALL_LEVELS} className={inputCls}>
              {Object.values(CourseLevel).map((l) => (
                <option key={l} value={l}>{fa.courseLevel[l as keyof typeof fa.courseLevel]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            شهریه پیش‌فرض (تومان)
            <span className="mr-2 text-xs font-normal text-[var(--color-text-muted)]">
              — فقط برای مرجع؛ ثبت‌نام رسمی در فاز بعدی
            </span>
          </label>
          <input name="defaultTuitionToman" type="number" min="0" step="1" className={inputCls} placeholder="مثال: 5000000" dir="ltr" />
        </div>

        <div>
          <label className={labelCls}>{fa.courses.description}</label>
          <textarea name="description" rows={4} className={inputCls} placeholder="توضیحات اختیاری دوره..." />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره دوره'}
          </button>
          <Link href="/courses" className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]">
            {fa.ui.cancel}
          </Link>
        </div>
      </form>
    </div>
  )
}
