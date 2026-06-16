import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { fa } from '@irno/i18n'
import type { CertificateTemplateDto, PaginatedCertificateTemplates } from '@irno/types'
import { CertificateTemplateType } from '@irno/types'

export const metadata: Metadata = { title: 'قالب‌های مدرک' }

interface PageProps {
  searchParams: Promise<{ search?: string; type?: string; page?: string }>
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    COURSE_COMPLETION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    EVENT_ATTENDANCE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    SKILL_CREDIT: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    MANUAL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    WORKSHOP: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    OTHER: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[type] ?? ''}`}>
      {fa.certificateTemplateType[type as keyof typeof fa.certificateTemplateType] ?? type}
    </span>
  )
}

async function fetchTemplates(params: {
  search?: string
  type?: string
  page: number
  limit: number
}): Promise<PaginatedCertificateTemplates> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.type) qs.set('type', params.type)
  qs.set('page', String(params.page))
  qs.set('limit', String(params.limit))
  try {
    const res = await fetch(
      `${process.env['HUB_API_URL'] ?? 'http://localhost:4000'}/api/v1/certificate-templates?${qs.toString()}`,
      {
        headers: { Cookie: token ? `irno_at=${token}` : '' },
        cache: 'no-store',
      },
    )
    if (!res.ok) return { data: [], total: 0, page: 1, limit: 20 }
    const raw = (await res.json()) as { data?: PaginatedCertificateTemplates }
    return raw.data ?? { data: [], total: 0, page: 1, limit: 20 }
  } catch {
    return { data: [], total: 0, page: 1, limit: 20 }
  }
}

export default async function CertificateTemplatesPage({ searchParams }: PageProps) {
  const { search, type, page: pageStr } = await searchParams
  const page = Number(pageStr ?? '1') || 1
  const result = await fetchTemplates({ search, type, page, limit: 20 })

  function buildUrl(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams()
    const merged = { search, type, page: String(page), ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== '0') qs.set(k, v)
    }
    return `/certificate-templates?${qs.toString()}`
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {fa.certificates.templates}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            قالب‌های مورد استفاده برای صدور مدارک دانشجویان
          </p>
        </div>
        <Link
          href="/certificate-templates/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          + قالب جدید
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="جستجو در عنوان..."
          className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          <option value="">همه نوع‌ها</option>
          {Object.values(CertificateTemplateType).map((t) => (
            <option key={t} value={t}>
              {fa.certificateTemplateType[t as keyof typeof fa.certificateTemplateType]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
        >
          جستجو
        </button>
        {(search ?? type) && (
          <Link
            href="/certificate-templates"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            پاک کردن
          </Link>
        )}
      </form>

      {/* Table */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">هیچ قالبی یافت نشد.</p>
          <Link
            href="/certificate-templates/new"
            className="mt-4 inline-block text-sm text-[var(--color-brand-600)] hover:underline"
          >
            + ایجاد اولین قالب
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                {['عنوان', 'نوع', 'زبان', 'وضعیت', 'تاریخ ایجاد', ''].map((h) => (
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
              {result.data.map((t: CertificateTemplateDto) => (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/certificate-templates/${t.id}`}
                      className="font-medium text-[var(--color-brand-600)] hover:underline"
                    >
                      {t.title}
                    </Link>
                    <div className="text-xs text-[var(--color-text-muted)] font-mono" dir="ltr">
                      {t.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={t.type} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {fa.certificateLanguage[t.language as keyof typeof fa.certificateLanguage] ?? t.language}
                  </td>
                  <td className="px-4 py-3">
                    {t.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        فعال
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                        غیرفعال
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Link
                      href={`/certificate-templates/${t.id}`}
                      className="text-xs text-[var(--color-brand-600)] hover:underline"
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
        <div className="mt-6 flex items-center justify-between gap-2 text-sm">
          <span className="text-[var(--color-text-muted)]">
            {result.total} قالب — صفحه {result.page}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={buildUrl({ page: String(result.page - 1) })}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                قبلی
              </Link>
            )}
            {result.page * result.limit < result.total && (
              <Link
                href={buildUrl({ page: String(result.page + 1) })}
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
