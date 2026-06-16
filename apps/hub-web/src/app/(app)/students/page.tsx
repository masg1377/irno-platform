import type { Metadata } from 'next'
import Link from 'next/link'
import { getStudents } from '@/lib/api'
import { fa } from '@irno/i18n'
import { StudentStatus } from '@irno/types'

export const metadata: Metadata = {
  title: 'دانشجویان',
}

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const { search, status, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1

  const result = await getStudents({ search, status, page, limit: 20 })

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {fa.students.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.students.subtitle}</p>
        </div>
        <Link
          href="/students/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.students.newStudent}
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder={fa.students.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">{fa.students.allStatuses}</option>
          {Object.values(StudentStatus).map((s) => (
            <option key={s} value={s}>
              {fa.studentStatus[s as keyof typeof fa.studentStatus] ?? s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
        >
          جستجو
        </button>
      </form>

      {/* Table */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.students.noStudents}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-right">
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">نام</th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">
                  {fa.students.studentCode}
                </th>
                <th className="hidden px-4 py-3 font-medium text-[var(--color-text-muted)] md:table-cell">
                  {fa.students.mobile}
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">
                  {fa.students.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-xs font-semibold text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)]">
                        {student.firstName?.[0] ?? '؟'}
                      </div>
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium text-[var(--color-brand-600)] hover:underline"
                      >
                        {student.fullName}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">
                    {student.studentCode}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-[var(--color-text-secondary)] md:table-cell" dir="ltr">
                    {student.mobile}
                  </td>
                  <td className="px-4 py-3">
                    <StudentStatusBadge status={student.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>
          {result.total} دانشجو · صفحه {result.page} از{' '}
          {Math.ceil(result.total / result.limit) || 1}
        </span>
        <div className="flex gap-2">
          {result.page > 1 && (
            <Link
              href={buildPageUrl({ search, status, page: result.page - 1 })}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              قبلی
            </Link>
          )}
          {result.page * result.limit < result.total && (
            <Link
              href={buildPageUrl({ search, status, page: result.page + 1 })}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              بعدی
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function buildPageUrl(params: { search?: string; status?: string; page: number }) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  qs.set('page', String(params.page))
  return `/students?${qs.toString()}`
}

export function StudentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    GRADUATED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  const label = fa.studentStatus[status as keyof typeof fa.studentStatus] ?? status
  const cls = colors[status] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
}
