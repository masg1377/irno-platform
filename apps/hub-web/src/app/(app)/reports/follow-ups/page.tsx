import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe, getReportFollowUps } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = { title: 'پیگیری‌ها' }

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]

export default async function FollowUpsReportPage() {
  const user = await getMe()
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.accessDenied}</p>
      </div>
    )
  }

  const items = await getReportFollowUps()

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          {fa.reports.title}
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fa.reports.followUps}</h1>
      </div>

      <p className="mb-4 text-sm text-[var(--color-text-muted)]">{fa.reports.followUpsSubtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.noData}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">نام</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">موبایل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">وضعیت</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">تاریخ پیگیری</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">دلیل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{item.fullName}</td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]" dir="ltr">{item.mobile}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {fa.applicantStatus[item.status as keyof typeof fa.applicantStatus] ?? item.status}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {item.followUpDate
                      ? new Date(item.followUpDate).toLocaleDateString('fa-IR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">{item.reason}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/applicants/${item.id}`}
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
    </div>
  )
}
