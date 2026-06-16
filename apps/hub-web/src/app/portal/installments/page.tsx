import type { Metadata } from 'next'
import { getPortalInstallments } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'اقساط من' }

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'پرداخت‌نشده',
  PAID: 'پرداخت‌شده',
  OVERDUE: 'سررسیدگذشته',
  WAIVED: 'بخشوده‌شده',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  PAID: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WAIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export default async function PortalInstallmentsPage() {
  const installments = await getPortalInstallments()

  const overdueCount = installments.filter((i) => i.status === 'OVERDUE').length
  const pendingCount = installments.filter((i) => i.status === 'PENDING').length

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.myInstallments}
      </h1>

      {overdueCount > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            ⚠️ {overdueCount} قسط سررسیدگذشته دارید. لطفاً هرچه زودتر پیگیری کنید.
          </p>
        </div>
      )}

      {installments.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">{fa.portal.noInstallments}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">دوره</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">{fa.portal.installmentAmount}</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">{fa.portal.dueDate}</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">{fa.portal.installmentStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {installments.map((i) => (
                <tr key={i.id} className={i.status === 'OVERDUE' ? 'bg-red-50/30 dark:bg-red-900/10' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {i.courseName ?? '—'}
                    </div>
                    {i.courseGroupName && (
                      <div className="text-xs text-[var(--color-text-muted)]">{i.courseGroupName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                    {i.amountToman.toLocaleString('fa-IR')}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {new Date(i.dueDate).toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[i.status] ?? ''}`}>
                      {STATUS_LABELS[i.status] ?? i.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        برای ثبت پرداخت قسط، با تیم ایرنو تماس بگیرید.
      </p>
    </div>
  )
}
