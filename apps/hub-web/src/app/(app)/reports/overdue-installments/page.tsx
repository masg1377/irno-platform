import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getReportOverdueInstallments } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = { title: 'اقساط معوق' }

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]

export default async function OverdueInstallmentsReportPage() {
  const user = await getMe()
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.accessDenied}</p>
      </div>
    )
  }

  const items = await getReportOverdueInstallments()
  const totalOverdue = items.reduce((sum, i) => sum + i.amountToman, 0)

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          {fa.reports.title}
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fa.reports.overdueInstallments}</h1>
      </div>

      {items.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {items.length.toLocaleString('fa-IR')} قسط معوق — مجموع: {totalOverdue.toLocaleString('fa-IR')} تومان
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.noData}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">دانشجو</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">موبایل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">دوره / گروه</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">مبلغ (تومان)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">سررسید</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">تأخیر</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((item) => (
                <tr key={item.installmentId} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-text-primary)]">{item.studentName}</div>
                    <div className="text-xs text-[var(--color-text-muted)] font-mono">{item.studentCode}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]" dir="ltr">{item.mobile}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    <div>{item.courseName}</div>
                    {item.courseGroupName && (
                      <div className="text-xs text-[var(--color-text-muted)]">{item.courseGroupName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400">
                    {item.amountToman.toLocaleString('fa-IR')}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {new Date(item.dueDate).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      {item.daysOverdue.toLocaleString('fa-IR')} {fa.reports.daysOverdue}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/payments/${item.paymentId}`}
                      className="text-xs text-[var(--color-brand-600)] hover:underline"
                    >
                      مشاهده پرداخت
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
