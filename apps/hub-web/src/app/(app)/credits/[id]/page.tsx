import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { fa } from '@irno/i18n'
import type { CreditDto } from '@irno/types'
import { CreditArchiveButton } from './credit-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function getCredit(id: string): Promise<CreditDto | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/credits/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: CreditDto }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const credit = await getCredit(id)
  return { title: credit?.title ?? 'اعتبار' }
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)]" dir={dir}>
        {value}
      </span>
    </div>
  )
}

export default async function CreditDetailPage({ params }: PageProps) {
  const { id } = await params
  const credit = await getCredit(id)
  if (!credit) notFound()

  const isArchived = credit.status === 'ARCHIVED'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/credits" className="hover:text-[var(--color-text-primary)]">
          {fa.credits.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{credit.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{credit.title}</h1>
          {isArchived && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
              بایگانی شد
            </span>
          )}
        </div>
        {!isArchived && (
          <div className="shrink-0">
            <CreditArchiveButton creditId={credit.id} />
          </div>
        )}
      </div>

      {/* Detail card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">اطلاعات اعتبار</h2>
        <InfoRow label="عنوان" value={credit.title} />
        <InfoRow label="Slug" value={credit.slug} dir="ltr" />
        <InfoRow
          label={fa.credits.creditType}
          value={fa.creditType[credit.type as keyof typeof fa.creditType] ?? credit.type}
        />
        <InfoRow
          label={fa.credits.status}
          value={fa.creditStatus[credit.status as keyof typeof fa.creditStatus] ?? credit.status}
        />
        <InfoRow
          label={fa.credits.expiresAfterDays}
          value={credit.expiresAfterDays != null ? `${credit.expiresAfterDays.toLocaleString('fa-IR')} روز` : 'بدون انقضا'}
        />
        <InfoRow
          label="تاریخ ایجاد"
          value={new Date(credit.createdAt).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
        <InfoRow
          label="آخرین ویرایش"
          value={new Date(credit.updatedAt).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
      </div>

      {/* Description */}
      {credit.description && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">توضیحات</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{credit.description}</p>
        </div>
      )}

      {/* Back */}
      <div className="mt-6">
        <Link
          href="/credits"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          ← بازگشت به لیست اعتبارها
        </Link>
      </div>
    </div>
  )
}
