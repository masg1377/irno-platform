import type { Metadata } from 'next'
import Link from 'next/link'
import { getEnrollments } from '@/lib/api'
import { fa } from '@irno/i18n'
import { EnrollmentStatus } from '@irno/types'

export const metadata: Metadata = { title: 'ثبت‌نام‌ها' }

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>
}

const statusColors: Record<EnrollmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAUSED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function formatToman(n: number) {
  return n.toLocaleString('fa-IR') + ' تومان'
}

export default async function EnrollmentsPage({ searchParams }: Props) {
  const sp = await searchParams
  const page = sp.page ? parseInt(sp.page, 10) : 1
  const status = sp.status || ''

  const result = await getEnrollments({ status: status || undefined, page, limit: 20 })

  const buildUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status ? { status } : {}), ...params })
    return `/enrollments?${p.toString()}`
  }

  return (
    <div dir="rtl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.enrollments.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.enrollments.subtitle}</p>
        </div>
        <Link
          href="/enrollments/new"
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors"
        >
          + {fa.enrollments.newEnrollment}
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <Link
          href="/enrollments"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!status ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-200)] text-[var(--color-brand-700)]' : 'bg-white dark:bg-gray-800 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}
        >
          {fa.enrollments.allStatuses}
        </Link>
        {Object.values(EnrollmentStatus).map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s, page: '1' })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${status === s ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-200)] text-[var(--color-brand-700)]' : 'bg-white dark:bg-gray-800 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}
          >
            {fa.enrollmentStatus[s]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
        {result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
            <p className="text-sm">{fa.enrollments.noEnrollments}</p>
            <Link href="/enrollments/new" className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400">
              {fa.enrollments.newEnrollment}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <tr>
                  {[fa.enrollments.student, fa.enrollments.course, fa.enrollments.group,
                    fa.enrollments.status, fa.enrollments.tuition, fa.enrollments.discount,
                    fa.enrollments.finalAmount, fa.enrollments.enrollmentDate, ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {result.data.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      <Link href={`/students/${e.studentId}`} className="hover:underline text-blue-600 dark:text-blue-400">
                        {e.studentName}
                      </Link>
                      <div className="text-xs text-[var(--color-text-muted)]">{e.studentCode}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      <Link href={`/courses/${e.courseId}`} className="hover:underline">{e.courseName}</Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {e.courseGroupName ? (
                        <Link href={`/groups/${e.courseGroupId}`} className="hover:underline">{e.courseGroupName}</Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[e.status]}`}>
                        {fa.enrollmentStatus[e.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">{formatToman(e.tuitionAmountToman)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">{e.discountAmountToman > 0 ? formatToman(e.discountAmountToman) : '—'}</td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)] whitespace-nowrap">{formatToman(e.finalAmountToman)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] whitespace-nowrap">
                      {new Date(e.enrollmentDate).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/enrollments/${e.id}`} className="text-blue-600 hover:underline dark:text-blue-400 text-xs">
                        جزئیات
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {result.total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>{result.total.toLocaleString('fa-IR')} ثبت‌نام</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]">قبلی</Link>
            )}
            {page * 20 < result.total && (
              <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]">بعدی</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
