import type { Metadata } from 'next'
import { getPortalPayments } from '@/lib/api'
import { fa } from '@irno/i18n'

export const metadata: Metadata = { title: 'پرداخت‌های من' }

const STATUS_LABELS: Record<string, string> = {
  UNPAID: 'پرداخت‌نشده',
  PARTIALLY_PAID: 'پرداخت ناقص',
  PAID: 'پرداخت‌شده',
  OVERDUE: 'معوق',
  REFUNDED: 'بازگشت داده‌شده',
  FREE: 'رایگان',
}

const STATUS_COLOR: Record<string, string> = {
  UNPAID: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PARTIALLY_PAID: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  PAID: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  REFUNDED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  FREE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

export default async function PortalPaymentsPage() {
  const payments = await getPortalPayments()

  const totalPaid = payments.reduce((s, p) => s + p.paidAmountToman, 0)
  const totalRemaining = payments.reduce((s, p) => s + p.remainingAmountToman, 0)

  return (
    <div dir="rtl" className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {fa.portal.myPayments}
      </h1>

      {payments.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">{fa.portal.paidAmount}</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {totalPaid.toLocaleString('fa-IR')} <span className="text-xs font-normal">تومان</span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">{fa.portal.remainingAmount}</div>
            <div className={`text-lg font-bold ${totalRemaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-primary)]'}`}>
              {totalRemaining.toLocaleString('fa-IR')} <span className="text-xs font-normal">تومان</span>
            </div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-text-muted)]">{fa.portal.noPayments}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-semibold text-[var(--color-text-primary)]">
                    {p.courseName ?? 'دوره'}
                  </h2>
                  {p.courseGroupName && (
                    <p className="text-sm text-[var(--color-text-muted)]">{p.courseGroupName}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status] ?? ''}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">{fa.portal.totalAmount}</div>
                  <div className="mt-0.5 font-semibold text-[var(--color-text-primary)]">
                    {p.totalAmountToman.toLocaleString('fa-IR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">{fa.portal.paidAmount}</div>
                  <div className="mt-0.5 font-semibold text-green-600 dark:text-green-400">
                    {p.paidAmountToman.toLocaleString('fa-IR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">{fa.portal.remainingAmount}</div>
                  <div className={`mt-0.5 font-semibold ${p.remainingAmountToman > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-primary)]'}`}>
                    {p.remainingAmountToman.toLocaleString('fa-IR')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        برای ثبت پرداخت جدید، لطفاً با تیم ایرنو تماس بگیرید.
      </p>
    </div>
  )
}
