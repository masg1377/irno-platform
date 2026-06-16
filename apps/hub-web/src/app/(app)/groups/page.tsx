import type { Metadata } from 'next'
import Link from 'next/link'
import { getCourseGroups, getCourses } from '@/lib/api'
import { fa } from '@irno/i18n'
import { CourseGroupStatus } from '@irno/types'

export const metadata: Metadata = { title: 'گروه‌های آموزشی' }

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; courseId?: string; page?: string }>
}

function GroupStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    COMPLETED: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {fa.courseGroupStatus[status as keyof typeof fa.courseGroupStatus] ?? status}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fa-IR')
}

export default async function GroupsPage({ searchParams }: PageProps) {
  const { search, status, courseId, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1

  const [result, coursesResult] = await Promise.all([
    getCourseGroups({ search, status, courseId, page, limit: 20 }),
    getCourses({ status: 'ACTIVE', limit: 100 }),
  ])

  function buildUrl(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams()
    const merged = { search, status, courseId, page: String(page), ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== '0') qs.set(k, v)
    }
    return `/groups?${qs.toString()}`
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.groups.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.groups.subtitle}</p>
        </div>
        <Link
          href="/groups/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.groups.newGroup}
        </Link>
      </div>

      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder={fa.groups.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none"
        />
        <select
          name="courseId"
          defaultValue={courseId ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">{fa.groups.allCourses}</option>
          {coursesResult.data.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">{fa.groups.allStatuses}</option>
          {Object.values(CourseGroupStatus).map((s) => (
            <option key={s} value={s}>{fa.courseGroupStatus[s as keyof typeof fa.courseGroupStatus]}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]">
          {fa.ui.filter}
        </button>
      </form>

      {result.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.groups.noGroups}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {['نام گروه', 'دوره', 'مدرس', 'منتورها', 'تاریخ شروع', 'تاریخ پایان', 'ظرفیت', 'وضعیت', 'عملیات'].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.map((g) => (
                <tr key={g.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3">
                    <Link href={`/groups/${g.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-600)]">
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    <Link href={`/courses/${g.courseId}`} className="hover:text-[var(--color-brand-600)]">{g.courseName}</Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{g.teacherName ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {g.mentors.length > 0 ? g.mentors.map((m) => m.name).join('، ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(g.startDate)}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(g.endDate)}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{g.capacity ?? '—'}</td>
                  <td className="px-4 py-3"><GroupStatusBadge status={g.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/groups/${g.id}`} className="text-[var(--color-brand-600)] hover:underline">مشاهده</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.total > result.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>مجموع: {result.total.toLocaleString('fa-IR')}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-bg-subtle)]">قبلی</Link>}
            {page * result.limit < result.total && <Link href={buildUrl({ page: String(page + 1) })} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-bg-subtle)]">بعدی</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
