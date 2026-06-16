import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayments, getFinanceSummary } from '@/lib/api'
import { fa } from '@irno/i18n'
import { PaymentStatus } from '@irno/types'

export const metadata: Metadata = { title: 'پرداخت‌ها' }

interface Props {
  searchParams: Promise<{ status?: string; overdue?: string; page?: string }>
}

const statusColors: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  REFUNDED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  FREE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

function fmt(n: number) { return n.toLocaleString('fa-IR') + ' ت' }

export default async function PaymentsPage({ searchParams }: Props) {
  const sp = await searchParams
  const page = sp.page ? parseInt(sp.page, 10) : 1
  const status = sp.status || ''
  const overdue = sp.overdue === 'true'

  const [result, summary] = await Promise.all([
    getPayments({ status: status || undefined, overdue, page, limit: 20 }),
    getFinanceSummary(),
  ])

  const buildUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status ? { status } : {}), ...(overdue ? { overdue: 'true' } : {}), ...params })
    return `/payments?${p.toString()}`
  }

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.payments.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.payments.subtitle}</p>
      </div>

      {/* Finance summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard label={fa.payments.totalPaid} value={fmt(summary.totalPaidToman)} color="green" />
          <SummaryCard label={fa.payments.totalRemaining} value={fmt(summary.totalRemainingToman)} color="orange" />
          <SummaryCard label={fa.payments.overdueInstallments} value={String(summary.overdueInstallmentsCount)} color="red" />
          <SummaryCard label={fa.payments.partiallyPaid} value={String(summary.partiallyPaidCount)} color="yellow" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <Link href="/payments"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!status && !overdue ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-200)] text-[var(--color-brand-700)]' : 'bg-white dark:bg-gray-800 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
          همه
        </Link>
        <Link href="/payments?overdue=true"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${overdue ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white dark:bg-gray-800 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
          معوق
        </Link>
        {[PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID, PaymentStatus.PAID, PaymentStatus.FREE].map(s => (
          <Link key={s} href={buildUrl({ status: s, page: '1' })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${status === s ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-200)] text-[var(--color-brand-700)]' : 'bg-white dark:bg-gray-800 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
            {fa.paymentStatus[s]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
        {result.data.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">{fa.payments.noPayments}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <tr>
                  {[fa.payments.title.replace('‌ها',''), fa.enrollments.course, fa.payments.totalAmount,
                    fa.payments.paidAmount, fa.payments.remainingAmount, fa.payments.status, ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {result.data.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/students/${p.studentId}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{p.studentName}</Link>
                      <div className="text-xs text-[var(--color-text-muted)]">{p.studentCode}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {p.courseName}{p.courseGroupName ? ` / ${p.courseGroupName}` : ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(p.totalAmountToman)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-green-700 dark:text-green-400">{fmt(p.paidAmountToman)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-orange-600 dark:text-orange-400">{p.remainingAmountToman > 0 ? fmt(p.remainingAmountToman) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>
                        {fa.paymentStatus[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/payments/${p.id}`} className="text-blue-600 hover:underline dark:text-blue-400 text-xs">جزئیات</Link>
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
          <span>{result.total.toLocaleString('fa-IR')} رکورد</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]">قبلی</Link>}
            {page * 20 < result.total && <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]">بعدی</Link>}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'border-green-200 dark:border-green-800',
    orange: 'border-orange-200 dark:border-orange-800',
    red: 'border-red-200 dark:border-red-800',
    yellow: 'border-yellow-200 dark:border-yellow-800',
  }
  return (
    <div className={`rounded-xl border bg-[var(--color-bg-elevated)] p-4 ${colorMap[color] ?? ''}`}>
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
