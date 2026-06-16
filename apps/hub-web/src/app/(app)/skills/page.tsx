import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { fa } from '@irno/i18n'
import { SkillLevel, SkillStatus } from '@irno/types'
import type { PaginatedSkills } from '@irno/types'
import { cookies } from 'next/headers'
import { CategoryFilterWidget } from '@/components/ui/CategoryFilterWidget'

export const metadata: Metadata = { title: 'مهارت‌ها' }

interface PageProps {
  searchParams: Promise<{ search?: string; level?: string; status?: string; categoryId?: string; page?: string }>
}

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function getSkills(params: {
  search?: string
  level?: string
  status?: string
  categoryId?: string
  page?: number
  limit?: number
}): Promise<PaginatedSkills> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return { data: [], total: 0, page: 1, limit: 20 }

  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.level) qs.set('level', params.level)
  if (params.status) qs.set('status', params.status)
  if (params.categoryId) qs.set('categoryId', params.categoryId)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))

  try {
    const res = await fetch(`${API_BASE}/skills?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { data: [], total: 0, page: 1, limit: 20 }
    const json = (await res.json()) as { data: PaginatedSkills }
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
      {fa.skillStatus[status as keyof typeof fa.skillStatus] ?? status}
    </span>
  )
}

export default async function SkillsPage({ searchParams }: PageProps) {
  const { search, level, status, categoryId, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1

  const result = await getSkills({ search, level, status, categoryId, page, limit: 20 })

  function buildUrl(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams()
    const merged = { search, level, status, categoryId, page: String(page), ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== '0') qs.set(k, v)
    }
    return `/skills?${qs.toString()}`
  }

  const inputCls =
    'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.skills.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.skills.catalog}</p>
        </div>
        <Link
          href="/skills/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + {fa.skills.newSkill}
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="جستجو در مهارت‌ها..."
          className={`w-full max-w-xs ${inputCls}`}
        />
        <select name="level" defaultValue={level ?? ''} className={inputCls}>
          <option value="">همه سطوح</option>
          {Object.values(SkillLevel).map((l) => (
            <option key={l} value={l}>
              {fa.skillLevel[l as keyof typeof fa.skillLevel]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ''} className={inputCls}>
          <option value="">همه وضعیت‌ها</option>
          {Object.values(SkillStatus).map((s) => (
            <option key={s} value={s}>
              {fa.skillStatus[s as keyof typeof fa.skillStatus]}
            </option>
          ))}
        </select>
        <Suspense>
          <CategoryFilterWidget
            taxonomyType="SKILL_CATEGORY"
            currentCategoryId={categoryId}
            placeholder="دسته‌بندی مهارت..."
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
          <p className="text-sm text-[var(--color-text-muted)]">{fa.skills.noSkills}</p>
          <Link href="/skills/new" className="mt-4 inline-block text-sm text-[var(--color-brand-600)] hover:underline">
            + {fa.skills.newSkill}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {['عنوان', 'دسته‌بندی', 'سطح', 'وضعیت', 'تاریخ ایجاد', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.map((skill) => (
                <tr key={skill.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/skills/${skill.id}`}
                      className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-600)]"
                    >
                      {skill.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">
                      {skill.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    {skill.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    {fa.skillLevel[skill.level as keyof typeof fa.skillLevel] ?? skill.level}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={skill.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                    {new Date(skill.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Link
                      href={`/skills/${skill.id}`}
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
