import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { fa } from '@irno/i18n'
import type { TaxonomyTermDto } from '@irno/types'
import { TaxonomyTermStatus } from '@irno/types'

export const metadata: Metadata = { title: 'جزئیات دسته‌بندی' }

interface PageProps {
  params: Promise<{ id: string }>
}

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function getTaxonomyTerm(id: string): Promise<TaxonomyTermDto | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return null

  try {
    const res = await fetch(`${API_BASE}/taxonomy/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const json = (await res.json()) as { data: TaxonomyTermDto }
    return json.data ?? null
  } catch {
    return null
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-[var(--color-border)] py-3 last:border-0">
      <dt className="w-36 shrink-0 text-sm font-medium text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--color-text-primary)]">{value ?? '—'}</dd>
    </div>
  )
}

export default async function TaxonomyDetailPage({ params }: PageProps) {
  const { id } = await params
  const term = await getTaxonomyTerm(id)

  if (!term) notFound()

  const isArchived = term.status === TaxonomyTermStatus.ARCHIVED

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/taxonomy" className="hover:text-[var(--color-text-primary)]">
          {fa.taxonomy.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{term.title}</span>
      </nav>

      {/* Title + status badge */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{term.title}</h1>
          {isArchived && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
              بایگانی شد
            </span>
          )}
          {!isArchived && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
              {fa.taxonomyTermStatus.ACTIVE}
            </span>
          )}
        </div>
        {!isArchived && (
          <ArchiveButton id={id} />
        )}
      </div>

      {/* Detail card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        <dl>
          <InfoRow
            label={fa.taxonomy.type}
            value={fa.taxonomyTermType[term.type as keyof typeof fa.taxonomyTermType] ?? term.type}
          />
          <InfoRow label={fa.taxonomy.slug} value={<span dir="ltr" className="font-mono text-xs">{term.slug}</span>} />
          <InfoRow
            label={fa.taxonomy.parentCategory}
            value={
              term.parentTitle ? (
                <Link href={`/taxonomy/${term.parentId}`} className="text-[var(--color-brand-600)] hover:underline">
                  {term.parentTitle}
                </Link>
              ) : '—'
            }
          />
          <InfoRow label={fa.taxonomy.description} value={term.description ?? '—'} />
          <InfoRow label={fa.taxonomy.sortOrder} value={String(term.sortOrder)} />
          <InfoRow
            label={fa.taxonomy.color}
            value={
              term.color ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-[var(--color-border)]"
                    style={{ background: term.color }}
                  />
                  <span dir="ltr" className="font-mono text-xs">{term.color}</span>
                </span>
              ) : '—'
            }
          />
          <InfoRow label={fa.taxonomy.icon} value={term.icon ?? '—'} />
          <InfoRow
            label="تاریخ ایجاد"
            value={new Date(term.createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          <InfoRow
            label="آخرین بروزرسانی"
            value={new Date(term.updatedAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
        </dl>
      </div>

      <div className="mt-4">
        <Link
          href="/taxonomy"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          ← بازگشت به لیست دسته‌بندی‌ها
        </Link>
      </div>
    </div>
  )
}

// Client component for archive action
import { ArchiveButton } from './archive-button'
