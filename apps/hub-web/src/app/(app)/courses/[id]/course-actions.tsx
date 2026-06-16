'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fa } from '@irno/i18n'
import { CourseStatus, CourseLevel } from '@irno/types'
import type { CourseDto } from '@irno/types'
import { TaxonomySelect } from '@/components/ui/TaxonomySelect'

export function CourseEditForm({ course }: { course: CourseDto }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  // Pre-seed from existing course data — categoryId is structured; category is legacy text
  const [categoryId, setCategoryId] = useState((course as any).categoryId ?? '')
  const [categoryTitle, setCategoryTitle] = useState((course as any).categoryTitle ?? course.category ?? '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    for (const [k, v] of fd.entries()) {
      if (v !== '') body[k] = k === 'defaultTuitionToman' ? Number(v) : v
    }
    if (fd.get('defaultTuitionToman') === '') body['defaultTuitionToman'] = null

    // Category from controlled state
    if (categoryId) {
      body['categoryId'] = categoryId
      body['category'] = categoryTitle
    } else if (categoryTitle) {
      body['category'] = categoryTitle
      body['categoryId'] = null
    }

    try {
      const res = await fetch(`/api/v1/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json() as { error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در ویرایش'))
      } else {
        setEditing(false)
        router.refresh()
      }
    } catch {
      setError('خطا در اتصال')
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('آیا از حذف یا آرشیو این دوره مطمئن هستید؟')) return
    const res = await fetch(`/api/v1/courses/${course.id}`, { method: 'DELETE', credentials: 'include' })
    const json = await res.json() as { data?: { message: string } }
    alert(json.data?.message ?? 'انجام شد')
    router.push('/courses')
    router.refresh()
  }

  const inputCls = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
  const labelCls = "mb-1 block text-xs font-medium text-[var(--color-text-muted)]"

  if (!editing) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
        >
          {fa.courses.editCourse}
        </button>
        <button
          onClick={handleDelete}
          className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          حذف / آرشیو دوره
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{fa.courses.editCourse}</h3>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div>
        <label className={labelCls}>{fa.courses.name}</label>
        <input name="title" defaultValue={course.title} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Slug</label>
        <input name="slug" defaultValue={course.slug} required dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>{fa.taxonomy.selectCategory}</label>
        <TaxonomySelect
          type="COURSE_CATEGORY"
          value={categoryId}
          onChange={(id, title) => { setCategoryId(id); setCategoryTitle(title ?? '') }}
          placeholder="انتخاب دسته‌بندی دوره..."
          initialLabel={categoryTitle || null}
        />
        {!categoryId && course.category && (
          <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">دسته‌بندی فعلی: {course.category}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>{fa.courses.status}</label>
        <select name="status" defaultValue={course.status} className={inputCls}>
          {Object.values(CourseStatus).map((s) => (
            <option key={s} value={s}>{fa.courseStatus[s as keyof typeof fa.courseStatus]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>سطح</label>
        <select name="level" defaultValue={course.level} className={inputCls}>
          {Object.values(CourseLevel).map((l) => (
            <option key={l} value={l}>{fa.courseLevel[l as keyof typeof fa.courseLevel]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>شهریه پیش‌فرض (تومان)</label>
        <input name="defaultTuitionToman" type="number" min="0" step="1" defaultValue={course.defaultTuitionToman ?? ''} dir="ltr" className={inputCls} />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? '...' : fa.ui.save}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
          {fa.ui.cancel}
        </button>
      </div>
    </form>
  )
}
