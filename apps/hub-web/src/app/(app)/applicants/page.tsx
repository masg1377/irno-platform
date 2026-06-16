import type { Metadata } from 'next'
import Link from 'next/link'
import { getApplicants } from '@/lib/api'
import { fa } from '@irno/i18n'
import { ApplicantStatus } from '@irno/types'

export const metadata: Metadata = {
  title: 'متقاضیان',
}

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function ApplicantsPage({ searchParams }: PageProps) {
  const { search, status, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1

  const result = await getApplicants({ search, status, page, limit: 20 })

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.applicants.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.applicants.subtitle}</p>
        </div>
        <Link
          href="/applicants/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.applicants.newApplicant}
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder={fa.applicants.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">{fa.applicants.allStatuses}</option>
          {Object.values(ApplicantStatus).map((s) => (
            <option key={s} value={s}>
              {fa.applicantStatus[s as keyof typeof fa.applicantStatus] ?? s}
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
          <p className="text-sm text-[var(--color-text-muted)]">{fa.applicants.noApplicants}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-right">
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">
                  {fa.applicants.fullName}
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">
                  {fa.applicants.mobile}
                </th>
                <th className="hidden px-4 py-3 font-medium text-[var(--color-text-muted)] md:table-cell">
                  {fa.applicants.source}
                </th>
                <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">
                  {fa.applicants.status}
                </th>
                <th className="hidden px-4 py-3 font-medium text-[var(--color-text-muted)] lg:table-cell">
                  {fa.applicants.assignedTo}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((applicant) => (
                <tr
                  key={applicant.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/applicants/${applicant.id}`}
                      className="font-medium text-[var(--color-brand-600)] hover:underline"
                    >
                      {applicant.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]" dir="ltr">
                    {applicant.mobile}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--color-text-muted)] md:table-cell">
                    {applicant.source ? (fa.applicantSource[applicant.source as keyof typeof fa.applicantSource] ?? applicant.source) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ApplicantStatusBadge status={applicant.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--color-text-muted)] lg:table-cell">
                    {applicant.assignedToName ?? fa.applicants.unassigned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination & count */}
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>
          {result.total} متقاضی · صفحه {result.page} از {Math.ceil(result.total / result.limit) || 1}
        </span>
        <div className="flex gap-2">
          {result.page > 1 && (
            <PaginationLink
              href={buildPageUrl({ search, status, page: result.page - 1 })}
              label="قبلی"
            />
          )}
          {result.page * result.limit < result.total && (
            <PaginationLink
              href={buildPageUrl({ search, status, page: result.page + 1 })}
              label="بعدی"
            />
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
  return `/applicants?${qs.toString()}`
}

function PaginationLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-[var(--color-border)] px-3 py-1 transition-colors hover:bg-[var(--color-bg-subtle)]"
    >
      {label}
    </Link>
  )
}

export function ApplicantStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NEW_APPLICANT:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CONTACTED:         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    CONSULTED:         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    READY_TO_REGISTER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    REGISTERED:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    NEEDS_FOLLOW_UP:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    NOT_INTERESTED:    'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
    CANCELLED:         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  const label = fa.applicantStatus[status as keyof typeof fa.applicantStatus] ?? status
  const cls = colors[status] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
}
