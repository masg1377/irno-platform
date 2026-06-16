import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe } from '@/lib/api'
import { fa } from '@irno/i18n'
import { UserRole } from '@irno/types'

export const metadata: Metadata = { title: 'گزارش‌ها' }

const REPORT_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT]
const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN]

export default async function ReportsIndexPage() {
  const user = await getMe()
  if (!user || !REPORT_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-[var(--color-text-muted)]">{fa.reports.accessDenied}</p>
      </div>
    )
  }

  const isAdmin = ADMIN_ROLES.includes(user.role)

  const reports = [
    {
      title: fa.reports.followUps,
      description: fa.reports.followUpsSubtitle,
      href: '/reports/follow-ups',
      icon: '🔔',
      roles: ADMIN_ROLES,
    },
    {
      title: fa.reports.overdueInstallments,
      description: fa.reports.overdueInstallmentsSubtitle,
      href: '/reports/overdue-installments',
      icon: '⚠️',
      roles: REPORT_ROLES,
    },
    {
      title: fa.reports.financeBalances,
      description: fa.reports.financeBalancesSubtitle,
      href: '/reports/finance',
      icon: '💰',
      roles: REPORT_ROLES,
    },
    {
      title: fa.reports.enrollmentSummary,
      description: fa.reports.enrollmentSummarySubtitle,
      href: '/reports/enrollments',
      icon: '📋',
      roles: ADMIN_ROLES,
    },
    {
      title: fa.reports.crmSummary,
      description: fa.reports.crmSummarySubtitle,
      href: '/reports/crm',
      icon: '📊',
      roles: ADMIN_ROLES,
    },
  ].filter((r) => r.roles.includes(user.role))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.reports.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.reports.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 hover:border-[var(--color-brand-300)] transition-colors"
          >
            <div className="text-2xl">{report.icon}</div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{report.title}</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{report.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
