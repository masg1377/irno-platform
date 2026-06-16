import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCourses } from '@/lib/api'
import { fa } from '@irno/i18n'
import { CourseStatus, CourseLevel } from '@irno/types'
import { CategoryFilterWidget } from '@/components/ui/CategoryFilterWidget'

export const metadata: Metadata = { title: 'دوره‌ها' }

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; level?: string; categoryId?: string; page?: string }>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    ARCHIVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {fa.courseStatus[status as keyof typeof fa.courseStatus] ?? status}
    </span>
  )
}

function formatToman(amount: number | null): string {
  if (amount === null) return '—'
  return amount.toLocaleString('fa-IR') + ' تومان'
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const { search, status, level, categoryId, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1

  const result = await getCourses({ search, status, level, categoryId, page, limit: 20 })

  function buildUrl(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams()
    const merged = { search, status, level, categoryId, page: String(page), ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== '0') qs.set(k, v)
    }
    return `/courses?${qs.toString()}`
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.courses.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.courses.subtitle}</p>
        </div>
        <Link
          href="/courses/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.courses.newCourse}
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder={fa.courses.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">{fa.courses.allStatuses}</option>
          {Object.values(CourseStatus).map((s) => (
            <option key={s} value={s}>{fa.courseStatus[s as keyof typeof fa.courseStatus]}</option>
          ))}
        </select>
        <select
          name="level"
          defaultValue={level ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">همه سطوح</option>
          {Object.values(CourseLevel).map((l) => (
            <option key={l} value={l}>{fa.courseLevel[l as keyof typeof fa.courseLevel]}</option>
          ))}
        </select>
        <Suspense>
          <CategoryFilterWidget
            taxonomyType="COURSE_CATEGORY"
            currentCategoryId={categoryId}
            placeholder="دسته‌بندی دوره..."
          />
        </Suspense>
        <button
          type="submit"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
        >
          {fa.ui.filter}
        </button>
      </form>

      {/* Table */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.courses.noCourses}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {['عنوان دوره', 'دسته‌بندی / سطح', 'شهریه', 'وضعیت', 'گروه‌ها', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.map((course) => (
                <tr key={course.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3">
                    <Link href={`/courses/${course.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-600)]">
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-[var(--color-text-secondary)]">{course.category || '—'}</div>
                    <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {fa.courseLevel[course.level as keyof typeof fa.courseLevel] ?? course.level}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]" dir="ltr">{formatToman(course.defaultTuitionToman)}</td>
                  <td className="px-4 py-3"><StatusBadge status={course.status} /></td>
                  <td className="px-4 py-3 text-center text-sm text-[var(--color-text-secondary)]">{course.groupCount ?? 0}</td>
                  <td className="px-4 py-3 text-left">
                    <Link href={`/courses/${course.id}`} className="text-sm text-[var(--color-brand-600)] hover:underline">مشاهده</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {result.total > result.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>مجموع: {result.total.toLocaleString('fa-IR')}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]">قبلی</Link>
            )}
            {page * result.limit < result.total && (
              <Link href={buildUrl({ page: String(page + 1) })} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]">بعدی</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
