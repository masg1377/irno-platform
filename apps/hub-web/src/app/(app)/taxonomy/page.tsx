import type { Metadata } from 'next'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { TaxonomyTermType, TaxonomyTermStatus } from '@irno/types'
import type { PaginatedTaxonomyTerms } from '@irno/types'
import { cookies } from 'next/headers'

export const metadata: Metadata = { title: 'دسته‌بندی‌ها' }

interface PageProps {
  searchParams: Promise<{
    type?: string
    status?: string
    search?: string
    page?: string
  }>
}

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function getTaxonomyTerms(params: {
  type?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedTaxonomyTerms> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return { data: [], total: 0, page: 1, limit: 20 }

  const qs = new URLSearchParams()
  if (params.type) qs.set('type', params.type)
  if (params.status) qs.set('status', params.status)
  if (params.search) qs.set('search', params.search)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))

  try {
    const res = await fetch(`${API_BASE}/taxonomy?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { data: [], total: 0, page: 1, limit: 20 }
    const json = (await res.json()) as { data: PaginatedTaxonomyTerms }
    return json.data ?? { data: [], total: 0, page: 1, limit: 20 }
  } catch {
    return { data: [], total: 0, page: 1, limit: 20 }
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    ARCHIVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {fa.taxonomyTermStatus[status as keyof typeof fa.taxonomyTermStatus] ?? status}
    </span>
  )
}

export default async function TaxonomyPage({ searchParams }: PageProps) {
  const { type, status, search, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1

  const result = await getTaxonomyTerms({ type, status, search, page, limit: 20 })

  function buildUrl(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams()
    const merged = { type, status, search, page: String(page), ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== '0') qs.set(k, v)
    }
    return `/taxonomy?${qs.toString()}`
  }

  const inputCls =
    'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.taxonomy.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.taxonomy.subtitle}</p>
        </div>
        <Link
          href="/taxonomy/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.taxonomy.newTerm}
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder={fa.lookup.searchPlaceholder}
          className={`w-full max-w-xs ${inputCls}`}
        />
        <select name="type" defaultValue={type ?? ''} className={inputCls}>
          <option value="">همه انواع</option>
          {Object.values(TaxonomyTermType).map((t) => (
            <option key={t} value={t}>
              {fa.taxonomyTermType[t as keyof typeof fa.taxonomyTermType]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ''} className={inputCls}>
          <option value="">همه وضعیت‌ها</option>
          {Object.values(TaxonomyTermStatus).map((s) => (
            <option key={s} value={s}>
              {fa.taxonomyTermStatus[s as keyof typeof fa.taxonomyTermStatus]}
            </option>
          ))}
        </select>
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
          <p className="text-sm text-[var(--color-text-muted)]">{fa.taxonomy.noTerms}</p>
          <Link
            href="/taxonomy/new"
            className="mt-4 inline-block text-sm text-[var(--color-brand-600)] hover:underline"
          >
            + {fa.taxonomy.newTerm}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {[fa.taxonomy.termTitle, fa.taxonomy.type, fa.taxonomy.slug, fa.taxonomy.parentCategory, fa.taxonomy.status, fa.taxonomy.sortOrder, ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.map((term) => (
                <tr key={term.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/taxonomy/${term.id}`}
                      className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-600)]"
                    >
                      {term.title}
                    </Link>
                    {term.color && (
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ background: term.color }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    {fa.taxonomyTermType[term.type as keyof typeof fa.taxonomyTermType] ?? term.type}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">
                    {term.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                    {term.parentTitle ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={term.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                    {term.sortOrder}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Link
                      href={`/taxonomy/${term.id}`}
                      className="text-sm text-[var(--color-brand-600)] hover:underline"
                    >
                      مشاهده
                    </Link>
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
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                قبلی
              </Link>
            )}
            {page * result.limit < result.total && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                بعدی
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
